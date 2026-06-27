# 스토리보드 기획 프롬프트 (PLAN 단계)

> 이 프롬프트를 LLM(Claude)에게 주면 → 입력(캐릭터+제품+컨셉)으로부터
> **6컷 스토리보드 JSON**을 출력한다. 세션에서는 Claude가 직접, 독립 실행 시엔
> Claude API로 호출한다. 출력은 `schema.json` 구조를 정확히 따라야 한다.

## 입력
- character: 캐릭터 키 (characters.json 중 하나) + 그 설정
- product: { name, info(특징/USP), image_refs(힉스필드 media/element id) }
- concept: 한 줄 컨셉 (예: "못 나는 기린새가 제품으로 하늘로 승천")

## 출력 규칙
1. **구조**: 4~6컷. 권장 = beat 3 + transition 2 (= 5) 또는 beat 3 + transition 3.
   - beat = 핵심 장면(이미지 1장 → 클립). transition = 두 beat를 잇는 연결/변신(모핑).
2. **감정 아크**: "문제/결핍 → 제품 등장 → 사용 → 변화/해결 → 행복한 결말(+제품샷)".
3. 각 컷의 `image_prompt`는 **캐릭터 + 필요한 소품 + 배경**을 구체적으로. 9:16, 3D 픽사풍, 캐릭터 일관성 문구 포함. 제품이 나오는 컷은 제품 라벨/형태를 묘사.
4. `motion_prompt`는 그 이미지를 **어떻게 움직일지**(동작·카메라).
5. transition 컷은 `morph_from`/`morph_to`(인접 beat의 id)를 지정하고 `video_model: "seedance_2_0"`. beat 컷은 `video_model: "kling3_0_turbo"`.
6. `transition_effect`는 컷 사이 전환(`cut` 기본, 변신 강조 시 `fadewhite`).
7. `sfx`에 컷 내 상대시간(at_rel)으로 효과음 이벤트(type: spark/shimmer/whoosh/boom/pop).
8. 마지막 컷 또는 ending_logo에 **제품명/로고**만(중간 자막 최소화).
9. 제품 정보(USP)를 카피·엔딩에 자연스럽게 녹인다.

## 출력 형식
`schema.json` 구조의 **JSON만** 출력(설명 텍스트 없이).

## 예시
`examples/girabird.storyboard.json` 참고.
