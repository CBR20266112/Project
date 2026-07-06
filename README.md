# Sleepy Sheep (PBL1)

힐링 수면 메이트 웹앱 **Sleepy Sheep** 프로젝트입니다.

## 배포 링크 (GitHub Pages)

| 용도 | URL |
|------|-----|
| **공식 접속 (권장)** | https://cbr20266112.github.io/PBL1/PBL1/index.html |
| **루트 접속** | https://cbr20266112.github.io/PBL1/index.html → 앱 폴더로 자동 이동 |

교수님·다른 학생에게 공유할 때는 **공식 접속 링크**를 사용하세요.  
GitHub Pages는 공개 HTTPS 주소이므로 **다른 네트워크·IP에서도** 별도 설정 없이 접속할 수 있습니다.

## 현재 버전

**v1.72.6** (`PBL1/js/constants.js`의 `APP_VERSION`)

### v1.72.6 주요 변경
- **앱 바로가기 추가** 유도 (PWA 설치 배너 + 설정 메뉴)
- 쓰다듬기 포즈 이미지 pose6~8 반영

### v1.72.5 주요 변경
- 메에메에 캘린더 보강 (수면 탭 전용)
- 쓰다듬기 랜덤 효과·양 문질러 쓰다듬기
- 모닝콜 = 수면·기상 입력 시간 연동
- **PWA 백그라운드 모닝콜 알림** (Service Worker + 브라우저 알림)

## 폴더 구조

```
PBL1/                   ← GitHub 리포지토리
├── index.html          ← PBL1/index.html 로 리다이렉트
├── README.md
├── .nojekyll
└── PBL1/               ← Sleepy Sheep 앱 본체
    ├── index.html
    ├── manifest.webmanifest
    ├── sw.js
    ├── css/
    ├── js/
    ├── pages/
    └── assets/
```

## 브랜치 동기화 (main · v1.72.6)

업데이트 후 아래처럼 `main`과 `v1.72.6` 브랜치를 맞춥니다.

```bash
git add .
git commit -m "업데이트 내용"
git push origin main
git push origin main:v1.72.6
```

## 백그라운드 모닝콜 사용법

1. 설정 → **푸시 알림 수신** 켜기 (브라우저 알림 허용)
2. 수면 탭에서 **취침·기상 시간** 입력
3. 홈에서 잠자기 시작 시 기상 시간 확인
4. 기상 시간에 알림 → 탭하면 모닝콜 실행

> iOS Safari는 PWA·백그라운드 알림 제한이 있을 수 있습니다. Android Chrome·데스크톱 Chrome 권장.

## GitHub Pages 설정

리포지토리 **Settings → Pages** 에서:

- **Source**: Deploy from a branch
- **Branch**: `main` (또는 `v1.72.6`) / **Folder**: `/ (root)`

저장 후 1~3분 뒤 배포 링크에서 반영됩니다.
