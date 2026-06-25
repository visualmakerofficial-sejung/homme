# 여기서부터 — 새 창에서 이어가기 (RESUME)

> 새 Claude 창(세션)을 열었다면, 이 파일 하나로 이전 작업을 그대로 이어갈 수 있습니다.
> 새 Claude 에게 이렇게 말하세요:
>
> **"image-to-video/START_HERE.md 읽고 이어서 작업해줘"**

대화 내용이 사라져도 **작업물은 사라지지 않습니다.** 프로그램·브리프·문서는 모두
git 저장소(브랜치 `claude/peaceful-pascal-uoo75x`)에 저장돼 있어, 새 세션은
저장소를 그대로 받아 이어갑니다. (채팅에 올린 파일이 많아져 막혀도 새 창에서 계속 가능)

---

## 이 프로젝트가 하는 일

**캐릭터 이미지 + 제품 사진** 을 넣어 "문제 → 제품 등장 → 사용 → 완벽한 결과"
구조의 **9:16 광고 릴스(MP4)** 를 반복 생성. 자막·음성은 영상마다 **한국어/영어** 선택.

- 엔진: **Higgsfield AI**(장면 생성) + 로컬 **ffmpeg**(자막·음성·합성)
- 전체 워크플로우: [PIPELINE.md](PIPELINE.md)

## 현재 상태 (2026-06 기준)

- [x] 파이프라인/툴킷 완성 (`reel/`, `plan_reel.py`, `compose_reel.py`)
- [x] 예시 브리프(머리빗) + 템플릿 (`briefs/`)
- [x] 합성(자막·9:16·전환·음성) 테스트 통과
- [ ] **Higgsfield 크레딧 충전** (현재 0 → 결제 필요)
- [ ] **캐릭터 이미지 + 제품 사진** 준비 (`briefs/assets/`)
- [ ] 실제 광고 영상 1편 생성 (크레딧+이미지 준비되면)

## 새 세션에서 할 일 (체크리스트)

1. **환경 준비** — 새 컨테이너면 도구 자동 설치됨(SessionStart 훅).
   안 됐으면 수동으로:
   ```bash
   bash image-to-video/setup.sh
   ```
2. **이미지 넣기** — 캐릭터/제품 이미지를 저장소에 둔다(영속화):
   ```
   image-to-video/briefs/assets/character.png
   image-to-video/briefs/assets/product.png
   ```
   (채팅에 올린 업로드는 세션이 끝나면 사라지므로, 저장소에 커밋해야 다음에도 씀)
3. **레시피 확인** (크레딧 0원):
   ```bash
   cd image-to-video
   python3 plan_reel.py --brief briefs/hairbrush_ko.json          # 한국어
   python3 plan_reel.py --brief briefs/hairbrush_ko.json --lang en  # 영어
   ```
4. **장면 클립 생성** (Higgsfield, 크레딧 사용) — Claude 에게
   "브리프대로 장면 생성해줘" 라고 요청. 결과를 `work/clips/` 에 순서대로 저장.
5. **최종 합성** (크레딧 0원):
   ```bash
   python3 compose_reel.py --brief briefs/hairbrush_ko.json \
       --clips-dir work/clips --lang ko --voice tts -o output/ad_ko.mp4
   ```

## 새 광고를 만들 때

`briefs/_template.json` 을 복사해 제품·대사만 바꾸면 됩니다. 또는 Claude 에게
"○○ 제품으로 △△ 컨셉 광고 브리프 만들어줘" 라고 하면 채워 줍니다.

## 핵심 파일 지도

| 파일 | 역할 |
|------|------|
| `START_HERE.md` | (이 파일) 새 세션 이어가기 |
| `PIPELINE.md` | 전체 제작 워크플로우 |
| `briefs/` | 광고 설정(브리프) + 캐릭터/제품 이미지(assets/) |
| `plan_reel.py` | 브리프 → AI 생성 레시피 출력 |
| `compose_reel.py` | AI 클립 → 자막·음성 합성 → 최종 MP4 |
| `reel/` | 내부 모듈(브리프·렌더·합성·오디오) |
| `setup.sh` | 새 세션 도구 자동 설치 |

## 동시에 여러 개 / 다국어

- 같은 클립으로 `--lang ko` / `--lang en` 만 바꿔 한·영 버전을 각각 출력(클립 재사용).
- 여러 제품 브리프를 차례로 돌려 배치 제작 가능. Higgsfield 동시 생성 한도:
  PLUS=영상6·이미지8, ULTRA=영상8·이미지8.
