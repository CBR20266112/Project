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

**v1.72.1** (`PBL1/js/constants.js`의 `APP_VERSION`)

## 폴더 구조

```
PBL1/                   ← GitHub 리포지토리
├── index.html          ← PBL1/index.html 로 리다이렉트
├── README.md
├── .nojekyll
└── PBL1/               ← Sleepy Sheep 앱 본체
    ├── index.html
    ├── css/
    ├── js/
    ├── pages/
    └── assets/
```

## 브랜치 동기화 (main · v1.72.1)

업데이트 후 아래처럼 `main`과 `v1.72.1` 브랜치를 맞춥니다.

```bash
git add .
git commit -m "업데이트 내용"
git push origin main
git push origin main:v1.72.1
```

`v1.72.1` 브랜치가 아직 없으면 위 `git push origin main:v1.72.1` 한 번으로 생성됩니다.

## GitHub Pages 설정

리포지토리 **Settings → Pages** 에서:

- **Source**: Deploy from a branch
- **Branch**: `main` (또는 `v1.72.1`) / **Folder**: `/ (root)`

저장 후 1~3분 뒤 배포 링크에서 반영됩니다.
