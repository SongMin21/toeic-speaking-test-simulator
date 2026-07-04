/**
 * TOEIC Speaking Drill — Azure TTS 프록시 (Cloudflare Worker)
 *
 * Azure 키를 클라이언트에 노출하지 않고 팀 전체가 Neural 음성을 쓰기 위한 프록시.
 *
 * 배포 방법 (대시보드 기준, 5분 소요):
 *   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. 이 파일 내용을 붙여넣고 Deploy
 *   3. Worker → Settings → Variables and Secrets 에서 추가:
 *      - AZURE_KEY    (type: Secret)  = Azure Speech 키
 *      - AZURE_REGION (type: Text)    = 예: koreacentral
 *   4. 발급된 URL(예: https://toeic-tts.xxxx.workers.dev)을
 *      index.html의 "TTS 프록시 URL" 칸에 입력 (또는 코드에 기본값으로 넣어 커밋해도 안전)
 */

const ALLOWED_VOICES = new Set([
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-US-AriaNeural',
  'en-GB-SoniaNeural',
  'en-AU-NatashaNeural',
]);

const MAX_TEXT_LEN = 500; // 남용 방지: 질문 한 문단이면 충분

const CORS = {
  'Access-Control-Allow-Origin': '*', // 필요 시 "https://SongMin21.github.io" 로 제한
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: CORS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('invalid JSON', { status: 400, headers: CORS });
    }

    const text = (body.text || '').trim();
    const voice = ALLOWED_VOICES.has(body.voice)
      ? body.voice
      : 'en-US-JennyNeural';

    if (!text || text.length > MAX_TEXT_LEN) {
      return new Response('text required (max ' + MAX_TEXT_LEN + ' chars)', {
        status: 400,
        headers: CORS,
      });
    }

    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
      `<voice name='${voice}'><prosody rate='-5%'>${esc(text)}</prosody></voice>` +
      `</speak>`;

    const azureRes = await fetch(
      `https://${env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': env.AZURE_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'toeic-speaking-drill',
        },
        body: ssml,
      },
    );

    if (!azureRes.ok) {
      const detail = await azureRes.text().catch(() => '');
      return new Response(
        'azure error ' +
          azureRes.status +
          (detail ? ': ' + detail.slice(0, 500) : ''),
        { status: 502, headers: CORS },
      );
    }

    return new Response(azureRes.body, {
      headers: {
        ...CORS,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800', // 같은 문장 1주 캐시 → 쿼터 절약
      },
    });
  },
};
