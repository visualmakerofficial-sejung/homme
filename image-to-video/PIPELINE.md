# 광고 릴스 제작 파이프라인 (캐릭터 + 제품)

레퍼런스 영상들처럼 **캐릭터가 등장해 문제를 겪다가 → 제품이 나오고 → 사용 →
완벽한 결과** 로 끝나는 9:16 광고 릴스를 **반복 생성**하기 위한 워크플로우.

핵심: **캐릭터 이미지 + 제품 사진** 두 장을 레퍼런스로 넣어, AI가 그 캐릭터와
그 제품이 등장하는 장면들을 만들고, 각 장면을 영상으로 애니메이션한 뒤,
자막(KO/EN)·음성·음악을 입혀 하나로 합친다.

```
 브리프(brief.json)
   ├─ 캐릭터 이미지 ─┐
   ├─ 제품 이미지 ───┤→ [Higgsfield] 장면별 클립 생성 ─┐
   └─ 장면/자막/언어 ─┘                                  │
                                                         ▼
                        [compose_reel.py] 9:16 정규화 + 자막 번인 + 음성/음악
                                                         ▼
                                              최종 릴스 MP4 (output/)
```

---

## 단계 0 — 준비물

1. **캐릭터 이미지** 1장 (`briefs/.../assets/character.png`)
   - 배경이 단순할수록 일관성↑. 정면/반측면 권장.
2. **제품 사진** 1장 (`assets/product.png`)
   - 실제 광고할 제품. 깔끔한 배경(누끼)일수록 합성 품질↑.
3. **브리프** (`briefs/_template.json` 복사) — 장면/자막/언어 작성.
4. **Higgsfield 크레딧** (영상 생성에 필요. 현재 잔액 0 → 충전 후 가능)

> 캐릭터 이미지가 없으면? 1단계에서 `character.description` 만으로 AI가 캐릭터를
> 먼저 한 장 생성한 뒤, 그걸 레퍼런스로 고정해 일관성을 유지할 수 있다.

## 단계 1 — 레시피 확인 (크레딧 0원)

```bash
python plan_reel.py --brief briefs/hairbrush_ko.json          # 한국어
python plan_reel.py --brief briefs/hairbrush_ko.json --lang en  # 영어로 자막/음성 전환
```
각 장면을 어떤 레퍼런스(캐릭터/제품)와 어떤 프롬프트로 생성할지 미리 검토한다.

## 단계 2 — 장면 클립 생성 (Higgsfield, 크레딧 사용)

브리프의 각 장면을 순서대로 생성한다. 모델/레퍼런스 규칙:

| 장면(beat) | 레퍼런스 | 설명 |
|-----------|---------|------|
| problem   | 캐릭터 | 문제 상황. 제품 미등장 |
| product   | 캐릭터 + **제품** | 제품 첫 등장 |
| use       | 캐릭터 + **제품** | 제품 사용 장면 |
| result    | 캐릭터 | 만족스러운 결과 |

**권장 모델: Seedance 2.0** (`seedance_2_0`)
- 레퍼런스 이미지로 **캐릭터·제품 일관성** 유지 (multi-reference)
- 9:16, 4~5초/클립, `generate_audio` 로 네이티브 사운드 옵션
- 레퍼런스는 `medias` 에 `role: "image"` (캐릭터, 제품) 로 전달

생성 방식 2가지:
- **A. 레퍼런스→비디오 (간단/저비용)**: 캐릭터(+제품) 이미지를 레퍼런스로 주고
  `image_prompt + motion_prompt` 로 바로 클립 생성.
- **B. 키프레임→비디오 (정밀)**: 먼저 이미지 모델(Nano Banana 등)로 캐릭터+제품을
  합성한 키프레임을 만들고, 그 이미지를 start_image 로 i2v. 구도 제어가 쉬움.

생성된 클립을 `work/clips/` 에 **장면 순서대로** 이름 정렬되게 저장
(`s1.mp4, s2.mp4, ...`).

> 이 단계는 Claude(Higgsfield MCP)가 대신 수행할 수 있다. "브리프대로 장면
> 생성해줘" 라고 하면 `plan_reel.py` 레시피 순서대로 클립을 만들어 준다.

## 단계 3 — 합성 (크레딧 0원, 로컬)

```bash
# 한국어 자막 + 한국어 TTS
python compose_reel.py --brief briefs/hairbrush_ko.json \
    --clips-dir work/clips --lang ko --voice tts -o output/hairbrush_ko.mp4

# 영어 자막 + AI 클립 원음 유지
python compose_reel.py --brief briefs/hairbrush_ko.json \
    --clips-dir work/clips --lang en --voice clip -o output/hairbrush_en.mp4
```

`compose_reel.py` 가 하는 일:
1. 각 클립을 **9:16(1080×1920) 정규화** (스케일+센터크롭, fps 통일)
2. 언어(`--lang ko|en`)에 맞는 **자막 번인** (하단, 외곽선+반투명 박스)
3. 장면 **크로스페이드** 로 이어붙이기
4. 음성 입히기 — `--voice`:
   - `tts` : 장면 내레이션을 한국어/영어 TTS 로 생성해 타이밍 배치 (+음악)
   - `clip`: AI 클립의 원래 오디오 유지
   - `none`: 음악만(또는 무음)
5. 배경음악 믹스 (`--music` 또는 브리프 `music`)

---

## 언어 전환 (KO / EN)

브리프의 모든 `caption`/`narration` 에 `ko`, `en` 을 함께 적어두면,
같은 클립으로 **자막·음성만 바꿔** 한국어판/영어판을 각각 뽑을 수 있다.
영상 생성(2단계)은 언어와 무관하므로 **클립은 한 번만 만들고 재사용**한다.

```bash
python compose_reel.py ... --lang ko -o output/ad_ko.mp4
python compose_reel.py ... --lang en -o output/ad_en.mp4
```

---

## 비용 감(感) — 대략

영상 1편 = 장면 4개 기준
- (B방식) 키프레임 이미지 4장 + i2v 클립 4개 (+선택 음성)
- (A방식) 레퍼런스→비디오 클립 4개

정확한 크레딧은 모델/해상도/길이에 따라 다르므로, 생성 직전
`generate_video(..., get_cost: true)` 로 **미리 비용을 확인**한 뒤 진행한다.
PLUS(1,000/월)·ULTRA(3,000/월) 플랜이면 월 수십 편 제작 가능 수준.

---

## 알아둘 점 / 한계

- **이모지**(✨ 등)는 한글 폰트(나눔)에 글리프가 없어 자막에서 □ 로 나온다.
  자막엔 이모지를 피하거나, 별도 이모지 폰트를 지정해야 한다.
- 캐릭터/제품 **일관성**은 레퍼런스 이미지 품질에 크게 좌우된다. 누끼/정면
  이미지가 가장 안정적이다.
- TTS(`--voice tts`)는 인터넷이 필요하다(gTTS). 막히면 자동으로 음성 생략.
  더 자연스러운 음성이 필요하면 Higgsfield `generate_audio`/`list_voices` 로
  내레이션을 만들어 `--voice clip` 또는 브리프 `narration` 오디오로 넣는다.
