# TOEIC Speaking Drill

토익 스피킹 연습 서비스. 문장을 등록하면 브라우저 TTS가 질문을 읽어주고, 설정한 준비 시간 → 답변 시간 타이머가 자동으로 진행됩니다.

## 기능

- 문장 등록/삭제 (Firebase Realtime DB 또는 localStorage)
- 준비 시간(초) / 답변 시간(초) 자유 설정 (자동 저장)
- 질문 음성 낭독 (Web Speech API, en-US, API 키 불필요)
- 낭독 종료 → 준비 타이머 → 삐 소리 → 답변 타이머 자동 진행
- 무작위 순서 / 질문 숨기기(듣기만) / 다음 문제 자동 진행 옵션
- 마지막 3초 카운트다운 비프음

## 배포 (GitHub Pages)

```bash
git init
git add .
git commit -m "feat: TOEIC Speaking drill service"
git branch -M main
git remote add origin https://github.com/SongMin21/toeic-speaking-drill.git
git push -u origin main
```

GitHub 저장소 → Settings → Pages → Source를 `main` 브랜치 `/ (root)`로 설정하면
`https://SongMin21.github.io/toeic-speaking-drill/` 에서 접속 가능합니다.

## Firebase 연동 (선택)

연동하지 않으면 localStorage 모드로 동작합니다 (해당 브라우저에만 저장).
여러 기기에서 문장을 공유하려면:

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. 빌드 → Realtime Database → 데이터베이스 만들기 (테스트 모드)
3. 프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가 → `firebaseConfig` 복사
4. `index.html`의 `firebaseConfig` 객체에 붙여넣기

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  projectId: "...",
  appId: "..."
};
```

> `databaseURL`이 있어야 Firebase 모드로 전환됩니다. 헤더의 배지가
> "Firebase 동기화 중"으로 바뀌면 성공.

### 보안 규칙 (권장)

테스트 모드는 공개 읽기/쓰기이므로, 개인용이라면 아래처럼 경로를 제한하세요.

```json
{
  "rules": {
    "toeic-speaking": {
      ".read": true,
      ".write": true
    },
    "$other": { ".read": false, ".write": false }
  }
}
```

## Azure 음성 — 팀 공유 (Cloudflare Workers 프록시, 권장)

브라우저 TTS 대신 Azure Neural 음성을 팀 전체가 키 노출 없이 사용합니다.

1. [Cloudflare 대시보드](https://dash.cloudflare.com) → Workers & Pages → Create Worker
2. `worker.js` 내용을 붙여넣고 Deploy
3. Worker → Settings → Variables and Secrets:
   - `AZURE_KEY` (Secret) = Azure Speech 키
   - `AZURE_REGION` (Text) = 예: `koreacentral`
4. 발급된 URL(`https://xxx.workers.dev`)을 처리 방법 중 택1:
   - **index.html의 `DEFAULT_PROXY` 상수에 넣고 커밋** → 팀원 전원 설정 없이 즉시 사용 (URL은 키가 아니므로 공개돼도 안전)
   - 또는 각자 페이지의 "TTS 프록시 URL" 칸에 입력

무료 한도: Cloudflare Workers 일 10만 요청, Azure F0 월 50만 자.
같은 문장은 브라우저 캐시 + CDN 캐시(1주)로 재호출을 줄입니다.

> 남용 방지를 위해 worker.js의 `Access-Control-Allow-Origin`을
> `https://SongMin21.github.io` 로 제한하는 것을 권장합니다.

## Azure 음성 — 개인 키 직접 입력 (선택)

프록시 없이 혼자 쓸 때는 페이지의 "개인 Azure 키" 칸에 키/리전 입력.
키는 localStorage(현재 브라우저)에만 저장되며 저장소에 포함되지 않습니다.

- 브라우저에서는 Azure REST 엔드포인트가 CORS로 차단되므로,
  공식 **Speech SDK(WebSocket)** 를 CDN에서 지연 로드해 호출합니다
- "음성 테스트" 버튼으로 연습 시작 전에 설정 확인 가능
- 호출 실패 시(키 오류, 쿼터 초과 등) 자동으로 브라우저 TTS로 대체
- 우선순위: 프록시 URL > 개인 키 > 브라우저 TTS

> 주의: 키를 index.html에 직접 하드코딩해서 커밋하지 마세요.
> GitHub Pages는 소스가 공개되므로 키가 노출됩니다.

## Notion 임베드

1. 배포 URL 복사 (`https://SongMin21.github.io/toeic-speaking-drill/`)
2. Notion에서 `/embed` → URL 붙여넣기
3. 문장은 Firebase로 공유, 시간 설정·문장 선택은 각자 브라우저에 저장

## 사용 흐름

1. 하단에서 연습 문장 추가 (Ctrl/Cmd + Enter로 빠른 등록)
2. 준비/답변 시간 설정 (예: Part 5 = 45초 / 60초, Part 4 Q9 = 3초 / 30초)
3. [연습 시작] → 질문 낭독 → 준비 → 답변 → (자동) 다음 문제
