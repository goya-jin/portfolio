# Goya Jin 관리자

공개 포트폴리오와 분리된 Next.js 관리자입니다. Vercel 프로젝트의 Root Directory는 `management`입니다.

## 보호 범위

- 글쓰기(`/write`)와 프로필 편집(`/profile`)은 서버에서 goya-jin 로그인 세션을 검사합니다.
- 모든 저장 API도 인증과 요청 Origin을 검사합니다.
- GitHub 로그인뿐 아니라 계정 ID `330348134`를 함께 확인합니다.
- GitHub 토큰은 HttpOnly 암호화 세션에 보관하며 클라이언트 session API에 반환하지 않습니다.
- 비밀키가 준비되지 않았을 때는 관리자 페이지와 API를 차단합니다.

## 로그인 설정

Vercel 환경변수에 아래 세 값을 Production으로 등록하세요. 비밀값은 GitHub 저장소나 채팅에 올리지 않습니다.

- AUTH_SECRET: 32바이트 이상의 난수 (로컬에서 `openssl rand -base64 32`로 생성)
- AUTH_GITHUB_ID: GitHub OAuth App의 Client ID
- AUTH_GITHUB_SECRET: 같은 앱의 Client Secret

OAuth App의 Homepage URL은 실제 관리자 Production URL입니다.
Authorization callback URL은 `https://관리자도메인/api/auth/callback/github`입니다.
등록 후 같은 production commit을 재배포합니다.

권한 범위 `read:user public_repo`는 GitHub 로그인 및 공개 portfolio 저장소 글/프로필 수정을 위해 사용합니다.
저장 대상은 서버 코드에서 `goya-jin/portfolio`로 고정되어 있습니다.
OAuth 앱 생성과 승인, 비밀값 등록은 계정 소유자가 직접 완료해야 합니다.

## 편집

프로필: 이름·지역·소개·학력·회사 경력·작품 이력을 편집합니다. 작품 이력은 역할·제목·연도·카테고리로 분리되고 순서를 바꿀 수 있습니다.
프로필 저장은 `info.html`을 갱신합니다. 다른 곳에서 먼저 변경한 경우 덮어쓰지 않습니다.
글쓰기: 새 글·기존 글 수정·이미지와 파일 첨부·본문 초안 저장을 지원합니다.
새 첨부파일은 전체 3MB, 최대 8개이며 브라우저 초안 저장에는 포함되지 않습니다.
공개 사이트 반영은 기존 GitHub Pages 자동 배포를 사용합니다.

## 검증

`pnpm test` / `pnpm build`
미인증 `/write`, `/profile`은 `/login`으로 이동하고, 저장 API는 401 또는 미설정 시 503을 반환해야 합니다.
실제 goya-jin OAuth 로그인과 저장 E2E는 환경변수 등록·사용자 승인 후 실행합니다.
