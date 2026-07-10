SleepySheep — ASMR "Tingle" Feature Report & Technical Analysis

작성일: 2026-07-10T12:59:53+09:00
작성자: Copilot CLI 런타임을 사용하는 AI 어시스턴트

요약
----
이 문서는 PBL1(SleepySheep) 웹앱에 새로 추가된 ASMR 프리셋 "팅글(tingle)" 기능의 구현 내역, 설계·기술적 분석, 테스트 절차, 잠재적 리스크 및 권장 후속 조치 등을 상세히 정리한 최종 보고서입니다. 새로 추가된 항목은 프로그램적(합성) 방식으로 Web Audio API를 사용해 생성되며 외부 오디오 샘플을 사용하지 않습니다.

주요 변경 사항 (개요)
-------------------
- js/sound.js
  - ASMR 메타데이터 리스트(ASMR_LIST)에 다음 항목을 추가:
    - tingle_soft: category='texture', emoji='✨', name='부드러운 팅글'
    - tingle_bell: category='texture', emoji='🔔', name='종소리 팅글'
  - _startAsmrById 매핑에 'tingle_soft' 및 'tingle_bell' 케이스 추가.
  - 실제 합성 재생 함수 추가:
    - _asmrTingleSoft(): 고주파 노이즈 펄스(하이밴드)와 얕은 저주파 배경을 불규칙하게 배치.
    - _asmrTingleBell(): 짧은 벨 톤(삼각파 오실레이터) 여러 개와 고주파 노이즈 반짝임을 배치.
  - playAsmr(id, opts) 콜을 통해 재생 제어(페이드 인 포함) 가능.

- index.html
  - 자동화 · 테스트 용으로 개발중 임시 접근성: window.resumeAudio 및 window.playAsmr를 노출(테스트 목적; 영구 노출 권장하지 않음).

- 기타
  - ASMR UI(js/asmr.js)는 ASMR_LIST를 사용해 목록을 렌더링하므로 새 항목은 정상적으로 등록되어 있어야 함. 단, 새 항목의 category가 'texture'이므로 ASMR 페이지의 '사각사각' 탭 또는 '전체' 탭에서만 보입니다.

상세 기술 분석
--------------
1) ASMR 항목 등록
  - ASMR_LIST는 sound.js 내부에 하드코딩된 배열입니다. 각 항목은 다음 프로퍼티를 포함:
    - id, category, emoji, name, desc
  - 추가된 tingle 항목은 category: 'texture'로 등록되어 있어 asmr.js의 필터 로직(filterAsmrList)에 따라 노출됩니다.

2) 합성 방식(구현 요약)
  - 모든 소리는 Web Audio API(오실레이터, 버퍼 소스, BiquadFilter, Gain 등)를 사용해 실시간 합성합니다.
  - _asmrTingleSoft():
    - 전체 재생 길이(dur ≈ 12s). 불규칙한 간격의 짧은 노이즈 버스트(밴드패스 필터)를 여러 번 스케줄.
    - 각 버스트는 작은 선형/지수 게인 엔벨로프를 가짐(attack 0.01s 수준, decay 0.04~0.12s)
    - 부가적으로 낮은 음역대의 소프트 윈드/패드(_addSoftWind 호출로 추정)를 약한 레벨로 추가해 공간감 부여.
    - CPU 제약: 노드 수/이벤트 밀도(버스트 빈도)를 제한해 모바일에서 과도한 부하가 발생하지 않도록 설계.

  - _asmrTingleBell():
    - 전체 재생 길이(dur ≈ 14s). 여러 개의 짧은 오실레이터 히트(삼각파), 각기 다른 base 주파수로 스케줄.
    - 각 히트는 매우 짧은 데케이(0.06~0.22s)로 반짝이는 효과를 냄.
    - 각 히트에 대응해 고역 잡음 반짝임(밴드패스 필터된 노이즈)을 추가해 금속성·섬세함 표현.
    - 역시 _addSoftWind 같은 저주파 배경을 약하게 추가해 전체 사운드의 조화 유지.

3) 재생 제어
  - playAsmr(id, opts) 호출 시 기존 재생을 stopAsmr()로 정리한 뒤 _startAsmrById로 선택된 프리셋 재생 시작.
  - fadeIn 옵션 처리: _fadeInAsmrGain(2.5) 등으로 부드럽게 볼륨을 올리는 로직이 존재.
  - stopAsmr()는 현재 스케줄된 노드들을 안전하게 stop/disconnect하고 gain을 원복함.

4) UI 쪽 노출 조건
  - asmr.js의 renderAsmrGrid(filter)와 initHomeAsmrSection은 getAsmrList() 결과를 필터해 UI에 채웁니다.
  - 추가한 항목은 category='texture'이므로 ASMR 페이지의 "사각사각" 탭 또는 "전체" 탭에서 확인 가능.
  - 홈(간단 UI)에는 'preset'과 category !== 'preset' 목록을 나눠 노출하므로, 모든 비-preset 항목이 홈에 차례로 노출되진 않습니다(정책에 따라 일부만 보여 줌).

법적·저작권 분석
----------------
- 기술적 사실: 새로 추가한 "팅글" 프리셋의 소리는 외부 오디오 샘플(녹음 파일)을 로드하지 않고 Web Audio API로 실시간 합성됩니다.
- 저작권 관점: 합성으로 생성된 음향은 외부 녹음·샘플을 사용하지 않는 한 일반적으로 제3자 저작권에 직접적으로 의존하지 않습니다. 그러나 다음 점을 유의하세요:
  1. 합성 알고리즘 자체(예: 특정 샘플 라이브러리의 알고리즘 또는 독점적 합성기)를 재현하거나 복제한 경우 알고리즘 저작권/특허 관련 이슈가 있을 수 있음(대부분의 경우 해당하지 않음).
  2. 생성된 오디오가 특정 상표·저명한 녹음과 실질적으로 동일하게 들린다면 법적 분쟁 소지가 이론적으로 존재할 수 있음(현실적으로 드물음).
  3. 여기서 제공된 기술적 설명은 법률 자문이 아닙니다. 법적 확답(특히 상업적 배포를 계획 중이면)은 별도의 법률 자문 필요.

운영·테스트 절차 (재현 가이드)
-----------------------------
환경 준비
  - Node/Python 등 간단한 정적 서버로 페이지를 제공해야 합니다. 레포지토리 루트에서 정적 서버 실행 권장 위치는 C:\Users\vipgo\Dev\PBL1

서버 시작(예)
  - Python 3: (PowerShell)
    cd C:\Users\vipgo\Dev\PBL1
    python -m http.server 5500

접속 URL
  - 홈: http://localhost:5500/index.html
  - ASMR 상세: http://localhost:5500/pages/asmr.html

기본 동작 테스트
  1. 브라우저에서 ASMR 상세 페이지 열기.
  2. 페이지에 사용자 상호작용(클릭/터치)이 필요할 수 있음 — 페이지 내 어떤 곳이든 한 번 클릭.
  3. 상단 카테고리에서 '사각사각' 또는 '전체'를 선택.
  4. 목록에서 '부드러운 팅글' (✨) 또는 '종소리 팅글' (🔔) 클릭.
  5. 소리가 들리는지 확인. (볼륨 조정: 앱 내 설정 혹은 브라우저 탭 볼륨)

자동화/머신 검사(내부 테스트)
  - 로컬 자동화(DevTools/CDP)를 통해 window.playAsmr / initSound / resumeAudio 호출로 재생을 요청할 수 있음.
  - 단, 일부 브라우저는 사용자 제스처 없이 AudioContext 재생을 허용하지 않음. CDP 플래그(--autoplay-policy=no-user-gesture-required)를 사용하면 가능.

로깅/디버그 포인트
  - sound.js 내부 getCtx()에서 AudioContext가 정상적으로 생성되는지 확인.
  - 브라우저 콘솔에서 예외 확인(예: 'AudioContext' 관련 권한/Autoplay 차단 메시지).
  - asmr.js의 getAsmrList() 결과 확인으로 UI 등록 상태 확인.

성능 고려사항
----------------
- ASMR 합성은 노드 수와 스케줄링 빈도에 따라 CPU 사용량이 달라집니다. 팅글 프리셋은 단기간의 짧은 이벤트(버스트/벨 히트)를 많이 만들기 때문에 저사양 환경에서는 과부하가 발생할 수 있습니다.
- 권장 최적화:
  1. 모바일/저사양에서는 노이즈 버퍼 생성 비용을 줄이기 위해 버퍼 재사용(pool) 또는 더 짧은 버퍼 사용.
  2. 이벤트 밀도(버스트 빈도)와 볼륨을 낮춘 프로파일을 제공(예: '저성능 모드').
  3. 많은 수의 동시 스케줄 노드 대신 합쳐서 처리 가능한 파이프라인(예: 여러 펄스를 하나의 버퍼로 합쳐 재생) 고려.

보안/배포 노트
----------------
- index.html에 임시로 노출한 window.playAsmr 등은 외부 스크립트가 임의로 ASMR을 트리거할 수 있으므로 장기적으로는 제거하거나 테스트 플래그로 제어해야 합니다.
- 프로덕션 배포 시 다음을 확인:
  - CSP(콘텐츠 보안 정책)에 모듈/스크립트 로딩 관련 규칙 포함 여부.
  - 번들링 시 sound.js 모듈이 제대로 번들링·트리쉐이킹 되는지 확인.

제안된 후속 작업
-----------------
1. UI 노출 개선
  - 사용자에게 새 항목(팅글)을 알리기 위해 ASMR 페이지에 'New' 배지 또는 홈 칩에 노출 옵션 추가.
  - 사용자가 팅글의 특성(세기, 빈도)을 조절할 수 있는 슬라이더(‘강도’, ‘섬세함’) 추가.

2. 퍼포먼스/호환성
  - 저사양 기기 모드(이벤트 밀도 감소, 노이즈 대체 소스 사용) 추가.
  - 모바일 Safari/Android WebView 등에서 pointer 이벤트, AudioContext 유효성 테스트 목록 작성 및 크로스브라우저 튜닝.

3. QA 테스트 케이스
  - 수동 테스트: 데스크톱(Chrome/Edge/Firefox), 모바일(Chrome Android, Safari iOS) 각각에서 재생 확인.
  - 자동화: CI에서 헤드리스 브라우저(autoplay 플래그 사용)로 AudioContext 생성과 함수 호출(실제 소리 확인은 수동) 검증.

첨부: 변경 파일 목록 (커밋 전 검토용)
------------------------------------
- modified: js/sound.js
  - 내용: ASMR_LIST 항목 추가, _startAsmrById 케이스 추가, _asmrTingleSoft(), _asmrTingleBell() 구현, playAsmr 제어 관련 로직(이미 존재)을 사용.
- modified: index.html
  - 내용: (임시) window.playAsmr 및 window.resumeAudio 노출 (테스트 용)

구현 코드(요약 발췌)
------------------
- ASMR_LIST 항목 예:
  { id: 'tingle_soft', category: 'texture', emoji: '✨', name: '부드러운 팅글', desc: '작은 고주파 펄스가 간질이는 느낌' }
  { id: 'tingle_bell', category: 'texture', emoji: '🔔', name: '종소리 팅글', desc: '짧고 반짝이는 벨 텍스처' }

- _asmrTingleSoft (핵심 로직 요약):
  - 일정 길이 동안 불규칙한 타이밍으로 노이즈 버스트 생성
  - 각 버스트: createNoise -> bandpass filter -> gain envelope
  - 배경으로 약한 저주파 패드 추가

- _asmrTingleBell (핵심 로직 요약):
  - 여러 짧은 오실레이터 히트(삼각파), 각각에 gain envelope 적용
  - 각 히트에 bandpass 노이즈 반짝임 추가

알려진 제한/미완료 항목
-----------------------
- UI 노출: 현재 tingle 항목은 category='texture'로 ASMR 페이지의 해당 탭에서만 보입니다. 홈(추천) 영역에 즉시 보여지도록 하려면 asmr.js 또는 ASMR_LIST에서 category 변경이 필요합니다.
- 추가적인 UI/튜닝: 사용자가 민감도/강도를 바꾸는 컨트롤 미구현.
- 자동화에서의 재생 확인: 브라우저 autoplay 정책으로 인해 헤드리스·원격 실행에서 추가 플래그/사용자 제스처가 필요합니다.

결론
----
- 기술적으로 새로 추가된 '팅글' 프리셋은 Web Audio API로 합성되어 앱 내부에서 즉시 재생 가능한 상태로 구현되었습니다.
- 현재 코드 베이스에 통합되어 있으며 ASMR 카테고리 필터 규칙에 따라 UI에 노출됩니다(기본적으로 '사각사각' 탭에 노출).
- 성능·호환성 조정, UI 노출 개선 및 사용자 설정 옵션 추가를 권장합니다.

부록: 빠른 재현 스크립트/명령
---------------------------
1) 서버 띄우기 (PowerShell)
   cd C:\Users\vipgo\Dev\PBL1
   python -m http.server 5500

2) 브라우저에서 열기
   http://localhost:5500/pages/asmr.html

3) 자동 재생 실패 시
   - 페이지를 한 번 클릭한 뒤 프리셋 클릭
   - 또는 Chrome을 다음 플래그와 함께 시작: --autoplay-policy=no-user-gesture-required

감사합니다.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
