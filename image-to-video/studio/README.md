# studio — 캐릭터 광고 영상 자동화 파이프라인

> **캐릭터 선택 + 제품 정보/사진 + 컨셉** 을 넣으면 →
> AI가 **스토리 기획 → 컷별 이미지 추출 → 이미지별 영상 제작** 을 자동화하여
> 캐릭터가 제품을 홍보하는 영상을 만든다. (조피아식 자동 스토리보드 + 일관된 커스텀 캐릭터 + 실제 클립 생성)

## 파이프라인 4단계

```
입력: 캐릭터(미리 제작) + 제품(정보+사진) + 컨셉 한 줄
  │
  ├─[1] PLAN     AI 스토리 기획 → 6컷 스토리보드(JSON)        ← Claude (planner_prompt.md)
  │                 각 컷 = 이미지프롬프트 + 모션 + 전환 + 효과음 + 자막
  ├─[2] IMAGE    스토리보드대로 4~6장 이미지 추출            ← 힉스필드 generate_image
  │                 (선택 캐릭터 element + 제품 ref → 일관성)   "마음에 들면 다음"
  ├─[3] VIDEO    이미지별 클립 (Kling=beat / Seedance=모핑)   ← 힉스필드 generate_video
  │
  └─[4] ASSEMBLE CapCut / 힉스필드 / conti(assemble.py)        ← 전환+사운드+로고
```

## studio.py 명령
```bash
python3 studio.py characters                       # 선택 가능한 캐릭터
python3 studio.py validate  <storyboard.json>      # 스토리보드 검증
python3 studio.py manifest  <storyboard.json>      # 생성 매니페스트(무엇을 어떻게 만들지)
python3 studio.py spec      <storyboard.json> --clips clips
                                                   # → conti 조립 스펙(JSON) 자동 생성
```

## 한 편 만드는 흐름 (실사용)

1. **캐릭터 선택**: `characters.json` 에서 (orangi / girabird / …). 새 캐릭터는 힉스필드에
   reference element 등록 후 여기에 `element_id` 추가.
2. **제품 입력**: 제품명·USP·이미지를 힉스필드에 올려 `image_refs`(media/element id) 확보.
3. **PLAN**: `planner_prompt.md` 를 Claude 에게 주고 입력을 넣으면 → `storyboard.json` 산출.
   (세션에서는 Claude 가 직접; 독립 실행은 Claude API.)
4. **검증**: `studio.py validate storyboard.json`
5. **IMAGE(Stage1)**: `studio.py manifest` 의 STAGE 1 목록대로 이미지 생성 → 검수/선택.
6. **VIDEO(Stage2)**: 마음에 들면 STAGE 2 목록대로 클립 생성 → 다운로드.
7. **ASSEMBLE**: `studio.py spec` → 조립 스펙 → `conti/assemble.py` 로 완성본,
   또는 클립을 CapCut/힉스필드로 가져가 마무리.

## 스토리보드(JSON) 구조 (요약)
```jsonc
{
  "project": "이름",
  "character": "girabird",                 // characters.json 키
  "product": { "name": "...", "info": "USP", "image_refs": ["힉스필드 id"] },
  "concept": "한 줄 컨셉",
  "format": { "aspect": "9:16", "clip_seconds": 5 },
  "shots": [                               // 4~6컷 (beat = 핵심장면, transition = 연결/모핑)
    { "id":"S1","role":"beat","title":"...","image_prompt":"...","motion_prompt":"...",
      "video_model":"kling3_0_turbo","transition_effect":"cut",
      "sfx":[{"at_rel":2.6,"type":"boom"}],"caption":null },
    { "id":"S4","role":"transition","morph_from":"S3","morph_to":"S5",
      "video_model":"seedance_2_0","motion_prompt":"...모핑..." }
  ],
  "audio": { "use_native": true, "bgm": "assets/demo_bgm.m4a", "bgm_gain": 0.22 },
  "ending_logo": ["제품명", "서브카피"]
}
```
전체 예시: `examples/girabird.storyboard.json`

## 자동화 경계선 (정직하게)
| 단계 | 누가 | 완전 무인화 조건 |
|------|------|------------------|
| 1 PLAN | Claude | Claude API 키 |
| 2·3 생성 | 힉스필드 | 힉스필드 API 키 |
| 다운로드 | (현재) 수동 1회 | 힉스필드 API 키로 우회 |
| 4 조립 | conti/assemble.py | 이미 완전 자동 |

→ **프레임워크는 완성**. **API 키 2개**를 꽂으면 입력→완성 직전까지 무인.
   키 없이도 Claude 가 manifest 를 따라 실행하면 동일하게 작동(현재 운영 방식).

## 비고 — "조피아"와의 차이
- 조피아: 간단 입력 → 스토리보드 자동 생성(주로 기획/그림).
- 이 시스템: **미리 만든 일관된 커스텀 캐릭터** + **제품 적용** + **실제 영상 클립 생성** +
  **사운드/전환/로고 자동 조립(conti)** 까지 한 줄기로.
