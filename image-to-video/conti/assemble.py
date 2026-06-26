#!/usr/bin/env python3
"""
conti/assemble.py — 콘티(스토리보드) 영상 조립기

구조: 중요 이미지 3장(beat) + 그 사이를 잇는 연결 클립 2개(transition) = 클립 5개.
이 프로그램은 "이미 생성된 클립들"(beat/transition)을 받아서
  - 순서대로 이어붙이고(이음매에 cut / 화이트플래시 등 전환효과)
  - 네이티브 사운드 + BGM + 효과음(SFX)을 믹스하고
  - 자막(엔딩 로고 등)을 얹어
하나의 최종 9:16 영상으로 출력한다.

생성(힉스필드 이미지→영상)은 별도 단계(README 참고)이고,
이 스크립트는 '조립'을 담당하는 완전 자동 프로그램이다.

사용법:
  python3 assemble.py spec.orangi.json
"""
import json, os, subprocess, sys, tempfile, shutil

FONT = "/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf"
AR = 44100


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.stderr.write("FFMPEG ERROR:\n" + p.stderr[-3000:] + "\n")
        raise SystemExit(f"command failed: {' '.join(cmd[:6])} ...")
    return p


def probe_dur(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return float(out)


def has_audio(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
         "stream=index", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return bool(out)


# ---------------------------------------------------------------- SFX library
# 각 효과음은 ffmpeg lavfi 로 합성한다(외부 음원 불필요). 타입을 추가하려면 여기에.
def sfx_filter(kind):
    """returns (lavfi_inputs:list[str], filtergraph:str, out_label:str)"""
    if kind == "spark":   # 발견/반짝 — 밝은 종소리
        return (["sine=frequency=1760:duration=0.7:sample_rate=%d" % AR,
                 "sine=frequency=2637:duration=0.7:sample_rate=%d" % AR],
                "[0][1]amix=inputs=2,afade=t=out:st=0.05:d=0.65:curve=exp,"
                "aformat=channel_layouts=stereo,volume=1.8[a]", "[a]")
    if kind == "shimmer":  # 반짝 샤워
        return (["sine=frequency=2637:duration=1.2:sample_rate=%d" % AR,
                 "sine=frequency=3520:duration=1.2:sample_rate=%d" % AR],
                "[0][1]amix=2,tremolo=f=13:d=0.6,afade=t=out:st=0.15:d=1.05,"
                "aformat=channel_layouts=stereo,volume=1.1[a]", "[a]")
    if kind == "whoosh":   # 변신 휘릭
        return (["anoisesrc=d=0.9:color=brown:amplitude=0.85:sample_rate=%d" % AR],
                "[0]highpass=f=220,lowpass=f=3800,afade=t=in:st=0:d=0.5,"
                "afade=t=out:st=0.55:d=0.35,aformat=channel_layouts=stereo,volume=1.7[a]", "[a]")
    if kind == "boom":     # 임팩트(저음)
        return (["sine=frequency=66:duration=0.8:sample_rate=%d" % AR],
                "[0]afade=t=out:st=0.05:d=0.75:curve=exp,"
                "aformat=channel_layouts=stereo,volume=2.8[a]", "[a]")
    if kind == "pop":      # 톡 / 줍기
        return (["sine=frequency=880:duration=0.25:sample_rate=%d" % AR],
                "[0]afade=t=out:st=0.02:d=0.23:curve=exp,"
                "aformat=channel_layouts=stereo,volume=2.0[a]", "[a]")
    raise SystemExit(f"unknown sfx type: {kind}")


def make_sfx(kind, path):
    ins, fg, out = sfx_filter(kind)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for s in ins:
        cmd += ["-f", "lavfi", "-i", s]
    cmd += ["-filter_complex", fg, "-map", out, path]
    run(cmd)


# ------------------------------------------------------------- video assembly
def build(spec_path):
    spec = json.load(open(spec_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(spec_path))
    work = tempfile.mkdtemp(prefix="conti_")

    out_cfg = spec.get("output", {})
    W = out_cfg.get("width", 716)
    H = out_cfg.get("height", 1284)
    FPS = out_cfg.get("fps", 24)
    out_path = os.path.join(base, out_cfg.get("path", "out/final.mp4"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    clips = spec["clips"]
    n = len(clips)
    paths = [os.path.join(base, c["file"]) for c in clips]
    durs = [probe_dur(p) for p in paths]

    # seams: 길이 n-1. 각 {effect: cut|fadewhite|fadeblack|dissolve|circleopen..., duration}
    seams = spec.get("seams", [{"effect": "cut"}] * (n - 1))
    assert len(seams) == n - 1, "seams 길이는 클립수-1 이어야 합니다"

    # ---- 누적 타임라인 계산 (xfade overlap 반영) ----
    starts = [0.0]
    total = durs[0]
    for i in range(1, n):
        eff = seams[i - 1].get("effect", "cut")
        d = float(seams[i - 1].get("duration", 0.0)) if eff != "cut" else 0.0
        starts.append(total - d)
        total += durs[i] - d
    print(f"[i] {n} clips, total ≈ {total:.2f}s")

    # ---------------- VIDEO filtergraph (reduce by concat/xfade) -------------
    vparts, acc = [], "v0"
    for i in range(n):
        vparts.append(
            f"[{i}:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p,settb=AVTB[v{i}]")
    acc_dur = durs[0]
    vchain = []
    for i in range(1, n):
        eff = seams[i - 1].get("effect", "cut")
        nxt = f"vc{i}"
        if eff == "cut":
            vchain.append(f"[{acc}][v{i}]concat=n=2:v=1:a=0,settb=AVTB[{nxt}]")
            acc_dur += durs[i]
        else:
            d = float(seams[i - 1].get("duration", 0.6))
            off = acc_dur - d
            vchain.append(
                f"[{acc}][v{i}]xfade=transition={eff}:duration={d}:offset={off:.3f}[{nxt}]")
            acc_dur += durs[i] - d
        acc = nxt

    # captions (drawtext)
    draw = []
    for cap in spec.get("captions", []):
        st, en = cap.get("start", 0), cap.get("end", total)
        style = cap.get("style", "plain")
        lines = cap["text"] if isinstance(cap["text"], list) else [cap["text"]]
        if style == "logo":
            # 1행: 골드 큰 로고, 2행: 흰색 서브
            tf1 = os.path.join(work, "cap_logo.txt"); open(tf1, "w").write(lines[0])
            draw.append(f"drawtext=fontfile={FONT}:textfile={tf1}:fontcolor=0xF2C879:"
                        f"fontsize={cap.get('size',64)}:box=1:boxcolor=black@0.5:boxborderw=26:"
                        f"x=(w-text_w)/2:y=h*{cap.get('y',0.42)}:enable='between(t,{st},{en})'")
            if len(lines) > 1:
                tf2 = os.path.join(work, "cap_sub.txt"); open(tf2, "w").write(lines[1])
                draw.append(f"drawtext=fontfile={FONT}:textfile={tf2}:fontcolor=white:"
                            f"fontsize={cap.get('size2',40)}:box=1:boxcolor=black@0.42:boxborderw=18:"
                            f"x=(w-text_w)/2:y=h*{cap.get('y',0.42)}+105:enable='between(t,{st},{en})'")
        else:
            tf = os.path.join(work, f"cap_{st}.txt"); open(tf, "w").write("\n".join(lines))
            draw.append(f"drawtext=fontfile={FONT}:textfile={tf}:fontcolor=white:"
                        f"fontsize={cap.get('size',50)}:line_spacing=8:box=1:boxcolor=black@0.45:"
                        f"boxborderw=22:x=(w-text_w)/2:y=h*{cap.get('y',0.73)}:"
                        f"enable='between(t,{st},{en})'")

    vf = spec.get("video_fades", {"in": 0.3, "out": 0.3})
    tail = []
    if draw:
        tail.append(",".join(draw))
    tail.append(f"fade=t=in:st=0:d={vf.get('in',0.3)}")
    tail.append(f"fade=t=out:st={total-vf.get('out',0.3):.3f}:d={vf.get('out',0.3)}")
    last_v = "vout"
    vchain.append(f"[{acc}]{','.join(tail)}[{last_v}]")

    # ---------------- AUDIO: native reduce (mirror seams) --------------------
    aud = spec.get("audio", {})
    native_wav = os.path.join(work, "native.wav")
    if aud.get("use_native", True):
        # 클립별 오디오 wav를 먼저 만든다 (오디오 없는 클립은 동일 길이 무음으로).
        seg_wavs = []
        for i, p in enumerate(paths):
            sw = os.path.join(work, f"na_{i}.wav")
            if has_audio(p):
                run(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-vn",
                     "-ac", "2", "-ar", str(AR), sw])
            else:
                run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                     "-i", f"anullsrc=r={AR}:cl=stereo", "-t", f"{durs[i]}", sw])
            seg_wavs.append(sw)
        aparts = [f"[{i}:a]aformat=channel_layouts=stereo:sample_rates={AR},"
                  f"asetpts=N/SR/TB[a{i}]" for i in range(n)]
        achain, aacc = [], "a0"
        for i in range(1, n):
            eff = seams[i - 1].get("effect", "cut")
            nxt = f"ac{i}"
            if eff == "cut":
                achain.append(f"[{aacc}][a{i}]concat=n=2:v=0:a=1[{nxt}]")
            else:
                d = float(seams[i - 1].get("duration", 0.6))
                achain.append(f"[{aacc}][a{i}]acrossfade=d={d}:c1=tri:c2=tri[{nxt}]")
            aacc = nxt
        fc = ";".join(aparts + achain)
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for sw in seg_wavs:
            cmd += ["-i", sw]
        cmd += ["-filter_complex", fc, "-map", f"[{aacc}]", native_wav]
        run(cmd)
    else:
        # 무음 베이스
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", f"anullsrc=r={AR}:cl=stereo", "-t", f"{total}", native_wav])

    # ---------------- SFX bed ------------------------------------------------
    sfx_events = aud.get("sfx", [])
    accents_wav = os.path.join(work, "accents.wav")
    if sfx_events:
        made = {}
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        labels = []
        for idx, ev in enumerate(sfx_events):
            kind = ev["type"]
            if kind not in made:
                wav = os.path.join(work, f"sfx_{kind}.wav"); make_sfx(kind, wav); made[kind] = wav
            cmd += ["-i", made[kind]]
        fc = []
        for idx, ev in enumerate(sfx_events):
            ms = int(float(ev["at"]) * 1000)
            g = float(ev.get("gain", 1.0))
            fc.append(f"[{idx}]volume={g},adelay={ms}|{ms}[s{idx}]")
            labels.append(f"[s{idx}]")
        fc.append("".join(labels) + f"amix=inputs={len(sfx_events)}:normalize=0,"
                  f"apad,atrim=0:{total}[ax]")
        cmd += ["-filter_complex", ";".join(fc), "-map", "[ax]", accents_wav]
        run(cmd)

    # ---------------- final audio mix ---------------------------------------
    final_audio = os.path.join(work, "finalaudio.wav")
    bgm = aud.get("bgm")
    mix_inputs, mix_labels, fc = [], [], []
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    # native
    cmd += ["-i", native_wav]
    fc.append(f"[0:a]volume={aud.get('native_gain',1.15)}[nat]"); mix_labels.append("[nat]")
    idx = 1
    if bgm:
        bp = os.path.join(base, bgm["file"])
        if bgm.get("loop", True):
            cmd += ["-stream_loop", "-1"]
        cmd += ["-i", bp]
        fc.append(f"[{idx}:a]atrim=0:{total},asetpts=N/SR/TB,volume={bgm.get('gain',0.22)},"
                  f"aformat=channel_layouts=stereo:sample_rates={AR}[bed]")
        mix_labels.append("[bed]"); idx += 1
    if sfx_events:
        cmd += ["-i", accents_wav]
        fc.append(f"[{idx}:a]volume={aud.get('sfx_gain',0.9)}[acc]")
        mix_labels.append("[acc]"); idx += 1
    fade_out = aud.get("master_fade_out", 0.85)
    fc.append("".join(mix_labels) + f"amix=inputs={len(mix_labels)}:normalize=0:duration=first,"
              f"afade=t=out:st={total-fade_out:.3f}:d={fade_out},alimiter=limit=0.95[mix]")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[mix]", final_audio]
    run(cmd)

    # ---------------- final mux ---------------------------------------------
    vfc = ";".join(vparts + vchain)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for p in paths:
        cmd += ["-i", p]
    cmd += ["-i", final_audio]
    cmd += ["-filter_complex", vfc, "-map", f"[{last_v}]", "-map", f"{n}:a",
            "-t", f"{total}", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", out_path]
    run(cmd)
    shutil.rmtree(work, ignore_errors=True)
    print(f"[✓] 완성: {out_path}  ({probe_dur(out_path):.2f}s)")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python3 assemble.py <spec.json>"); raise SystemExit(1)
    build(sys.argv[1])
