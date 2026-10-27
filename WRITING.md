# 글 추가하기

기존 포트폴리오는 유지하고 메뉴의 **Writing**으로 글 영역에 들어갑니다.
글 영역은 최신순 글 목록, 개별 글, 연도별 아카이브로 구성됩니다.
별도 관리 화면 없이 GitHub에서 Markdown 파일을 작성합니다.

1. `content/post-template.md` 내용을 복사합니다.
2. GitHub의 Add file → Create new file에서 `content/posts/my-new-post.md`를 만듭니다. 파일명은 영문 소문자·숫자·하이픈을 사용합니다. 파일명이 글 주소가 되므로 공개 이후에는 유지하세요.
3. 첫 줄의 제목(title), 날짜(date: YYYY-MM-DD)를 수정하고 본문을 씁니다.
4. 공개할 때 `draft`를 `false`로 설정하고 main에 저장합니다. `true`인 글은 사이트에 포함되지 않습니다.
5. Actions가 성공하면 글 상세·목록·연도별 아카이브가 함께 배포됩니다.

예시:

```markdown
{"title": "첫 번째 기록", "date": "2026-10-27", "draft": false}
---
본문을 작성합니다.

## 소제목

[링크](https://example.com)
```

이미지는 `assets`에 올린 뒤 `![설명](../../assets/파일명.jpg)`로 넣습니다.
`writing/`의 HTML은 생성 결과이므로 본문은 `content/posts/`에서 수정하세요.
안내 글 `about-this-archive.md`는 삭제하거나 비공개로 바꿔도 됩니다.

## GitHub Pages 최초 설정

저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정합니다.
`.github/workflows/pages.yml`이 main 변경 시 기존 포트폴리오와 글을 함께 배포합니다.
기존 외부 호스팅을 사용하는 경우 자동 배포 연결을 확인한 뒤 기존 방식을 유지할 수도 있습니다.

## 로컬 확인

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-writing.txt
.venv/bin/python scripts/build_writing.py
python3 -m http.server 8000
```

`http://localhost:8000/writing/`를 엽니다. 기존 CSS는 글 영역에 적용하지 않으며, 글 디자인은 `writing/writing.css`에서만 조정합니다.
