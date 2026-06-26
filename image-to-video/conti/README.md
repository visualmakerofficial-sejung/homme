# 콘티 영상 시스템 (conti)

> **중요 이미지 3장(beat) + 그 사이를 잇는 연결 클립 2개(transition) = 클립 5개**
> → 15~20초 9:16 영상. 소리·BGM·특수효과는 **설정(JSON)으로 주입**.

오랑이 × 오드실크 광고를 만들며 정립한 구조를 **재사용 프로그램**으로 만든 것입니다.

---

## 전체 구조 (2단계)

```
[1단계] 생성 (Higgsfield, Claude가 드라이브)        [2단계] 조립 (이 프로그램, 완전 자동)
─────────────────────────────────────────         ──────────────────────────────────
 이미지A ─┐                                          clips/ + spec.json
 이미지B ─┤ generate_image (레퍼런스로 일관성)   →   python3 assemble.py spec.json
 이미지C ─┘                                                    │
   │  각 이미지 → 영상(beat) : Kling Turbo                     ▼
   │  A→B, B→C 연결(transition) : Seedance(start+end 모핑)   최종 9:16 MP4
   ▼                                                  (이어붙이기+전환+사운드+자막)
 클립 5개
```

- **1단계 생성**은 힉스필드 계정/크레딧을 쓰므로 Claude 세션에서 진행합니다.
  (캐릭터·제품을 `show_reference_elements`로 등록 → `generate_image`로 키프레임 →
   `generate_video`로 클립. beat=Kling Turbo, transition=Seedance 2.0 start+end.)
- **2단계 조립**이 이 프로그램입니다. 생성된 클립 파일만 있으면 **오프라인 완전 자동**.

> ⚠️ 이 실행 환경은 힉스필드 결과 CDN이 차단돼 있어, 생성된 클립은
> **다운로드해서 `clips/`에 넣어** 조립합니다. (스펙의 `file` 경로가 그 클립들)

---

## 빠른 사용법

```bash
cd image-to-video/conti
# 1) 생성된 클립을 clips/ 에 넣는다 (예: 01_walk.mp4 ...)
# 2) spec.json 작성 (아래 포맷) — 예시: spec.orangi.json
python3 assemble.py spec.orangi.json
# → out/orangi_final.mp4 생성
```

준비물(자동 설치: `../setup.sh`): `ffmpeg`, 나눔폰트. 외부 음원 없이도 효과음은 합성됩니다.

---

## 스펙(JSON) 포맷

```jsonc
{
  "output": { "path": "out/final.mp4", "width": 716, "height": 1284, "fps": 24 },

  // 클립들을 순서대로. 보통 beat3 + transition2 = 5개.
  "clips": [
    { "file": "clips/01.mp4", "role": "beat" },
    { "file": "clips/02.mp4", "role": "transition" },
    { "file": "clips/03.mp4", "role": "beat" },
    { "file": "clips/04.mp4", "role": "transition" },
    { "file": "clips/05.mp4", "role": "beat" }
  ],

  // 이음매(클립수-1개). effect: cut | fadewhite | fadeblack | dissolve | circleopen | radial ...
  // 연결 클립(모핑)을 따로 둘 땐 그 양쪽 seam을 cut으로,
  // 연결 클립 없이 효과로 변신을 표현할 땐 fadewhite 등을 쓴다.
  "seams": [
    { "effect": "cut" },
    { "effect": "cut" },
    { "effect": "fadewhite", "duration": 0.6 }
  ],

  "audio": {
    "use_native": true,          // 클립의 네이티브 사운드(파도·동작·반응) 사용
    "native_gain": 1.15,
    "bgm": { "file": "assets/demo_bgm.m4a", "gain": 0.22, "loop": true },
    "sfx_gain": 0.9,
    "sfx": [                     // 효과음 이벤트 (at=초). type 목록은 아래.
      { "at": 6.8,  "type": "spark"   },
      { "at": 14.25,"type": "whoosh"  },
      { "at": 14.7, "type": "boom"    },
      { "at": 15.0, "type": "shimmer" }
    ],
    "master_fade_out": 0.85
  },

  // 자막. style:"logo" = 골드 로고+흰 서브 2행. 그 외는 일반 자막.
  "captions": [
    { "text": ["EAU DE SILK", "세리신 선세럼"], "style": "logo", "start": 17.0, "end": 99 }
  ],

  "video_fades": { "in": 0.3, "out": 0.3 }
}
```

### 효과음(SFX) 타입 (합성 — 외부 음원 불필요)
| type | 용도 |
|------|------|
| `spark`   | 발견/반짝 (밝은 종소리) |
| `shimmer` | 반짝 샤워 (변신 후 윤기) |
| `whoosh`  | 변신 휘릭 (스윕) |
| `boom`    | 임팩트 (저음 쿵) |
| `pop`     | 톡/줍기 (짧은 팝) |

새 효과음은 `assemble.py`의 `sfx_filter()`에 추가하면 됩니다.

### 전환(전이) 효과
ffmpeg xfade 전환을 그대로 사용: `fadewhite`(빛 변신), `fadeblack`, `dissolve`,
`circleopen`, `radial`, `wipeleft`, `slideup` 등. `cut`은 하드컷(전환 없음).

---

## 5클립 권장 구성 (beat3 + transition2)

```
이미지1(beat)  →  연결1(transition: Seedance 모핑)  →  이미지2(beat)
              →  연결2(transition: Seedance 모핑)  →  이미지3(beat)
```
- 연결 클립을 따로 만들면 → 양쪽 seam은 `cut`, 모핑 클립 자체가 전환이 됨(가장 자연스러움).
- 연결 클립 없이 가볍게 가려면 → 그 자리 seam에 `fadewhite` 등 효과 전환.

`spec.orangi.json`은 4클립(연결1=발견, 변신은 fadewhite) 버전 예시입니다.

---

## 파일
| 파일 | 설명 |
|------|------|
| `assemble.py` | 조립 프로그램 (스펙→최종 MP4) |
| `spec.orangi.json` | 예시 스펙 (오랑이 광고) |
| `clips/` | 생성된 클립 (beat/transition) |
| `assets/` | BGM 등 |
| `out/` | 최종 출력 |
