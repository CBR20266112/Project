/**
 * worry.js — 드리미 마음 상담소 AI 및 템플릿 분석 엔진 (3턴 제한 멀티턴 대응)
 */

// ─── 오프라인용 대화 턴별 프리셋 위로 리스트 ───
const PRESETS = {
  // 1) 취업 / 미래 / 진로
  future: {
    greetings: [
      "요즘 취업과 앞으로의 진로 때문에 마음이 참 무겁군요 양... 메에~",
      "미래가 불확실하게 느껴져서 밤새 잠 못 이루고 걱정만 쌓여가는군요, 메에...",
      "내일을 어떻게 준비해야 할지 불안하고 막막한 마음에 뒤척이고 계시군요양."
    ],
    comforts: [
      "하지만 너무 조급해하지 말아요양. 인생은 경주가 아니라 각자의 속도로 피어나는 꽃밭과 같아요. 당신은 이미 훌륭하게 최선을 다하고 있고, 조금 늦어지더라도 알맞은 때에 당신의 가치를 알아봐 줄 멋진 기회가 올 거예요, 메에~",
      "불안함은 더 나은 미래를 꿈꾸기 때문에 생기는 지극히 자연스러운 감정이양. 지금 겪는 방황은 결코 헛되지 않고 당신을 단단하게 만들어주는 뿌리가 될 거예요.",
      "남들과 비교하며 자신을 갉아먹지 말아요양. 당신은 존재만으로도 빛나는 특별한 사람이고, 묵묵히 걸어가다 보면 어느새 목표에 도달해 있을 거예요, 메에~"
    ],
    turns: [
      // 2턴째 (사용자가 더 하소연하거나 한마디 보탰을 때)
      "불안해하는 그 마음조차 스스로 더 나아가고 싶어 하는 예쁜 증거양. 드리미는 당신이 매일 조금씩 쌓아 올린 노력을 전부 다 믿고 있어요, 메에~!",
      // 3턴째 (마지막 위로)
      "충분히 힘든 시간을 견디고 있어요양. 모든 고민을 오늘 밤에 한 번에 해결할 필요는 없답니다. 내일의 나에게 한 걸음 양보하고 오늘은 푹 쉬어봐요."
    ]
  },
  // 2) 학업 / 시험 / 공부
  study: {
    greetings: [
      "시험이나 공부 스트레스로 머리가 온통 굳어버린 하루를 보내셨군요양, 메에...",
      "오늘도 하루 종일 지식을 채우고 집중하느라 뇌가 무척 피곤해진 상태네요양.",
      "학업과 성적 압박감에 눈을 감아도 불안한 생각들이 둥둥 떠다니는 밤이군요, 메에..."
    ],
    comforts: [
      "공부한 지식들은 우리가 깊은 잠을 자는 동안 뇌에 차곡차곡 정리되어 기억으로 저장된다고 해요양! 그러니까 오늘 밤 푹 자는 것도 공부의 연장선이랍니다.",
      "노력한 만큼 결과가 안 나올까 봐 미리 두려워하지 말아요. 당신이 흘린 땀방울과 시간은 배신하지 않고 차곡차곡 실력으로 쌓이고 있으니까요양, 메에~",
      "가끔은 뇌에도 쉼표가 필요해요양. 쉬지 않고 달리기만 하면 금방 방전되어 버린답니다. 오늘은 가쁜 숨을 가다듬고 온전히 휴식을 선택해봐요."
    ],
    turns: [
      "성공보다 더 중요한 건 끈기 있게 매일 마주하는 당신의 용기양. 충분히 멋지게 잘하고 있으니 너무 채찍질하지 말아요양, 메에~",
      "오늘 머릿속 걱정 버튼은 강제로 OFF해 두자양! 잠을 잘 자야 내일 공부할 집중력도 빵빵하게 충전되는 법이니까요."
    ]
  },
  // 3) 인간관계 / 갈등 / 외로움
  relation: {
    greetings: [
      "사람들의 말 한마디나 시선 때문에 마음의 상처를 받고 아파하는군요양, 메에...",
      "소중했던 관계가 삐걱거리거나 누군가와 다투어 머릿속이 복잡한 밤이군요양.",
      "곁에 아무도 없는 것처럼 외롭고 공허한 감정이 물밀듯이 밀려오는 밤이네요, 메에..."
    ],
    comforts: [
      "모든 사람에게 사랑받으려고 애쓰지 말아요양. 세상의 모든 양이 하얗지 않듯, 우리와 맞지 않는 사람도 있는 법이에요. 상처 준 사람들의 부정적인 기운은 그냥 흘려보내고 당신의 소중한 에너지를 스스로에게 집중해 줘요.",
      "누군가의 차가운 태도 때문에 스스로의 가치를 깎아내리지 마세요양. 당신은 그 자체로 따뜻하고 존경받아 마땅한 사람이에요, 메에~",
      "가끔은 혼자인 것 같아 쓸쓸할 때도 있지만, 드리미가 언제나 당신 곁에서 조용히 귀를 기울이고 수면을 지켜주고 있다는 걸 기억해요양!"
    ],
    turns: [
      "나를 미워하거나 상처 준 사람들을 생각하느라 오늘 밤 당신의 귀한 숙면 시간을 빼앗기지 말아요양. 그들은 그럴 자격이 없답니다, 메에~",
      "속상한 감정은 드리미의 복슬복슬한 하얀 털에 전부 묻어 문질러 털어버려요양. 오늘 밤은 오직 당신만을 위해 아주 포근할 거양."
    ]
  },
  // 4) 건강 / 체력 / 아픔
  health: {
    greetings: [
      "몸이 무겁고 피곤해서 마음의 여유까지 많이 사라져 힘든 상태이군요양, 메에...",
      "몸의 어딘가가 불편하거나 아파서 숙면을 취하기가 무척 어려운 밤이네요양.",
      "누적된 피로와 체력 저하로 온몸의 에너지가 완전히 고갈되어 버렸군요, 메에..."
    ],
    comforts: [
      "아플 때는 어떠한 고민도 내려놓고 오직 몸의 목소리에만 귀를 기울여야 해요양. 잠은 우리 몸의 면역 세포를 깨우고 스스로 치유하는 최고의 치료제랍니다.",
      "에너지가 바닥났을 때는 억지로 힘을 내려 하지 마세요양. 아무것도 하지 않고 가만히 누워 솜이불의 안락함만 느끼는 것만으로도 훌륭한 회복의 시작이에요, 메에~",
      "몸이 아프면 걱정이 더 많아지기 십상이지만, 푹 자고 일어나면 몸도 마음도 훨씬 가뿐해질 거예요. 드리미가 건강해지는 잠의 마법을 걸어둘게요양!"
    ],
    turns: [
      "많이 아프고 서러웠을 텐데 오늘도 꿋꿋하게 버텨내 줘서 정말 고마워요양, 메에~ 아픔아 가라, 훠이훠이!",
      "따뜻하게 목을 감싸고, 지금만큼은 아무런 생각도 하지 않은 채 눈을 감아봐요양. 온몸의 긴장이 풀리도록 드리미가 지켜줄게요."
    ]
  },
  // 5) 돈 / 경제력
  money: {
    greetings: [
      "금전적인 사정이나 현실적인 돈 걱정 때문에 머리가 깨질 듯 아프군요양, 메에...",
      "매달 돌아오는 생활비와 비용 걱정으로 어깨가 짓눌리는 무거운 기분을 느끼고 계시는군요양."
    ],
    comforts: [
      "현실적인 고민은 깊게 잘수록 내일 더 맑은 머리로 차분하게 돌파구를 찾을 수 있어요양. 밤새 뜬눈으로 고민한다고 돈이 지갑으로 들어오진 않으니까요, 메에~",
      "지금 당장 모든 짐을 한 번에 해결할 수는 없지만, 차근차근 헤쳐 나갈 힘은 매일의 좋은 수면에서 시작돼요양. 머릿속 계산기는 잠시 전원을 꺼두세요.",
      "무거운 경제적 현실 속에서도 오늘 하루 열심히 버티고 살아낸 자신을 진심으로 칭찬해 줘도 괜찮아요양. 당신의 끈기는 아주 강력해요, 메에~"
    ],
    turns: [
      "돈 걱정은 늘 밤에 더 무겁게 찾아오는 못된 습성이 있어요양. 하지만 아침이 되면 한결 해결할 방법들이 맑게 보일 거예요, 메에~",
      "오늘 밤 동안은 현실의 계산기는 완전히 덮어두자양. 편안하고 풍족한 꿈나라가 공짜로 기다리고 있으니까요!"
    ]
  },
  // 6) 일반 고민 / 불면 / 불안
  default: {
    greetings: [
      "침대에 누웠는데도 온갖 걱정들이 꼬리를 물고 이어져 괴로운 밤이군요양, 메에...",
      "생각의 늪에 빠져서 밤이 깊어가는데도 눈이 말망말망 피곤한 상태군요양.",
      "오늘 하루도 참 열심히 달려왔는데, 마음 한구석이 불안하고 허전해 뒤척이고 계시는군요양."
    ],
    comforts: [
      "그럴 땐 걱정거리들을 하나하나 붙잡지 말고 흘러가는 구름처럼 그냥 바라만 봐요양, 메에~ 머릿속 생각의 방 문을 하나씩 닫고 온전히 고요해지는 연습을 해봐요.",
      "숨을 깊게 들이쉬었다가 3초 동안 멈춘 뒤 끝까지 비워내 봐요양. 드리미의 보송하고 하얀 솜털을 쓰다듬는 상상을 하면 마음이 차분해질 거예요.",
      "오늘 부족했거나 아쉬웠던 일들이 떠올라도 괜찮아요양. 오늘 할 일은 무사히 다 마쳤고 이제는 평화롭게 쉴 권리가 있어요. 당신은 오늘 하루도 참 훌륭했답니다, 메에~"
    ],
    goodnight: [
      "더 이상 애쓰지 말고 드리미와 함께 편안한 꿀잠 세계로 넘어가요양. 잘 자요! 💤",
      "생각의 스위치를 OFF로 툭 내리고, 드리미의 따스한 품에서 메에~ 잠들어 봐요.",
      "당신의 밤이 무섭지 않도록 드리미가 머리맡에서 밤하늘 별지기가 되어 줄게요양. 푹 자요."
    ],
    turns: [
      "불안해하지 말아요양. 밤이 깊을수록 아침은 반드시 다시 찾아오니까요. 드리미가 꼭 안아줄게요 메에~",
      "복잡한 생각은 휴지조각처럼 꼬깃꼬깃 접어서 머리 밖으로 휙 던져버려요양. 오늘 밤은 푹 자기 약속양!"
    ]
  }
};

const KEYWORD_RESPONSES = [
  {
    keyword: "힘",
    response: "오늘도 정말 수고했어요. 드리미가 오늘 밤만큼은 당신 곁에서 함께 쉬어드릴게요. 🌙"
  },
  {
    keyword: "피곤",
    response: "많이 지친 하루였나 봐요. 오늘은 아무 걱정 없이 푹 쉬어가요."
  },
  {
    keyword: "우울",
    response: "마음이 흐린 날도 있어요. 드리미는 내일은 조금 더 맑아질 거라고 믿고 있어요."
  },
  {
    keyword: "슬",
    response: "슬픈 마음도 천천히 흘러가요. 오늘은 자신을 조금 더 다정하게 대해주세요."
  },
  {
    keyword: "외로",
    response: "혼자라고 느껴질 때도 드리미는 항상 당신을 기다리고 있어요."
  },
  {
    keyword: "불안",
    response: "모든 답을 오늘 찾지 않아도 괜찮아요. 지금은 편안히 쉬는 시간이 가장 중요해요."
  },
  {
    keyword: "걱",
    response: "걱정은 잠시 드리미에게 맡겨두세요. 오늘 밤은 마음도 함께 쉬어가요."
  },
  {
    keyword: "시험",
    response: "시험 준비 정말 고생했어요. 푹 자는 것도 좋은 결과를 위한 준비예요."
  },
  {
    keyword: "공부",
    response: "오늘 배운 것들은 쉬는 동안에도 차곡차곡 정리될 거예요. 잠시 쉬어가요."
  },
  {
    keyword: "과제",
    response: "과제는 내일의 나도 함께 해결해 줄 거예요. 오늘은 휴식도 중요한 일정이에요."
  },
  {
    keyword: "잠",
    response: "편안한 잠은 가장 소중한 선물이에요. 드리미가 좋은 밤을 응원할게요."
  },
  {
    keyword: "스트레스",
    response: "오늘 하루의 무거운 마음은 잠시 내려놓아요. 내일은 조금 더 가벼워질 거예요."
  },
  {
    keyword: "화",
    response: "속상했던 마음도 천천히 가라앉을 거예요. 오늘은 편안히 쉬어봐요."
  },
  {
    keyword: "짜증",
    response: "그럴 때도 있어요. 오늘은 아무것도 하지 않아도 괜찮은 밤이에요."
  },
  {
    keyword: "실패",
    response: "오늘의 실패가 내일의 끝은 아니에요. 드리미는 언제나 다시 시작하는 당신을 응원해요."
  },
  {
    keyword: "실수",
    response: "실수 하나로 당신의 하루가 결정되지는 않아요. 너무 오래 마음에 담아두지 마세요."
  },
  {
    keyword: "무서",
    response: "걱정하지 마세요. 오늘 밤은 드리미가 조용히 곁을 지켜드릴게요."
  },
  {
    keyword: "불면",
    response: "잠이 오지 않아도 괜찮아요. 눈을 감고 천천히 숨을 쉬다 보면 조금씩 편안해질 거예요."
  },
  {
    keyword: "졸",
    response: "몸이 휴식을 원하고 있나 봐요. 오늘은 조금 일찍 꿈나라로 떠나볼까요?"
  },
  {
    keyword: "행복",
    response: "행복했던 하루를 드리미도 함께 기억할게요. 내일도 웃을 일이 하나 더 생기길 바라요."
  }
];

const DAILY_LIMIT_REPLY = '오늘은 충분히 이야기를 들어드린 것 같아요.\n이제 편안히 쉬어보는 건 어떨까요? 🌙';

function findKeywordResponse(text, lang) {
  if (!text) return null;
  const normalized = text.toLowerCase();
  const responses = getKeywordResponses(lang);
  for (const rule of responses) {
    if (normalized.includes(rule.keyword)) {
      return rule.response;
    }
  }
  return null;
}

// ─── 카테고리 판별 헬퍼 ───
export function getWorryCategory(text) {
  if (!text) return 'default';
  const lang = getCurrentWorryLocale();
  const normalized = text.toLowerCase();
  const patterns = getCategoryPatterns(lang);

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(normalized)) {
      return category;
    }
  }
  return 'default';
}

// ─── 오프라인 텍스트 분석 로직 (3턴 턴제한 대응) ───
export function getLocalWorryReply(text, turnCount = 1, category = 'default') {
  const lang = getCurrentWorryLocale();
  if (!text || text.trim() === '') {
    return EMPTY_INPUT_REPLY[lang];
  }

  if (turnCount >= 4) {
    return DAILY_LIMIT_REPLY[lang];
  }

  const keywordReply = findKeywordResponse(text, lang);
  if (keywordReply) {
    return keywordReply;
  }

  const dataset = getWorryDataset(category, lang);
  if (turnCount === 1) {
    const greeting = dataset.greetings[Math.floor(Math.random() * dataset.greetings.length)];
    const comfort = dataset.comforts[Math.floor(Math.random() * dataset.comforts.length)];
    return `${greeting}\n\n${comfort}`;
  } else if (turnCount === 2) {
    return dataset.turns[0] || (lang === 'ko'
      ? '마음을 편하게 먹는 것이 최고의 시작이에요양. 걱정한다고 풀릴 일들이 아니니, 오늘 밤은 이 꼬여있는 생각 실타래를 드리미에게 가만히 맡겨두세요양, 메에~'
      : 'Taking a gentler approach is the best start. Worrying won’t fix everything tonight, so let Dreamy hold these tangled thoughts for a while, meeh~');
  } else {
    const finishMsg = dataset.turns[1] || (lang === 'ko'
      ? '오늘 밤은 푹 잠드는 것에만 뇌의 모든 힘을 보태주세요양, 메에~'
      : 'Tonight, focus all your energy on sleeping well, meeh~');
    return `${finishMsg}\n\n${lang === 'ko'
      ? '이제 서너 마디 대화는 다 마쳤으니, 눈을 붙이고 드리미와 함께 스르르 잘 시간양! 메에~ 🌙'
      : 'We’ve said enough for now. Close your eyes and drift off with Dreamy, meeh~ 🌙'}`;
  }
}

// ─── 온라인 Gemini API 호출 로직 (대화 히스토리 및 3턴 제한) ───
export async function getGeminiWorryReply(history, apiKey) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API 키가 없습니다.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 대화 턴 수 계산 (사용자의 메시지 수 기준)
  const userMessagesCount = history.filter(h => h.role === 'user').length;

  const systemInstruction = `
너는 밤에 온갖 걱정으로 수면장애를 겪는 사용자를 따스하게 보듬어주는 아기양 힐링 메이트 '드리미'야. 아래 작성 지침을 엄격히 지켜서 답장 편지를 작성해줘:
1. 반말이 아닌 따뜻하고 공감 가득한 존댓말을 사용할 것.
2. 아기양 콘셉트를 극대화하기 위해 문장 끝에 친근하게 '~양!', '메에~', '했다양!' 등을 자연스럽게 녹여줘. (모든 문장 끝에 도배하기보다는 리드미컬하고 자연스럽게 섞을 것)
3. 사용자가 고민을 털어놓은 내용에 진심으로 깊이 경청하고 다독여주는 조언과 위로를 건넬 것.
4. 편지 본문의 길이는 가독성이 좋게 줄바꿈을 활용하여 150자 내외로 너무 길지 않고 편안하게 작성해줘.
5. 현재 사용자와의 대화는 수면에 집중하기 위해 최대 서너 마디(3턴) 이내로 제한되어 있어.
   - 현재 사용자의 고민 입력 차례: ${userMessagesCount}번째 턴.
   - 만약 ${userMessagesCount}번째 턴이 3번째(혹은 3번째 이상)라면, 대화를 종결하고 무조건 잠자리에 들 수 있도록 "이제 대화는 마치고 드리미와 함께 눈을 감고 잠들 시간양! 메에~ 🌙" 형태의 수면 의식 멘트로 글을 단호하면서도 포근하게 맺어줘.
  `.trim();

  // 대화 히스토리 구성 (Gemini API 형식에 맞춤)
  // 최신 API에 맞추어 contents 구성
  const contents = history.map(item => ({
    role: item.role,
    parts: [{ text: item.content }]
  }));

  // 시스템 인스트럭션을 첫 사용자 입력 메시지 상단에 주입하거나, 프롬프트 형태로 구성
  if (contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `[지침: ${systemInstruction}]\n\n사용자 고민: ${contents[0].parts[0].text}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: contents
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP 에러: ${response.status}`);
  }

  const result = await response.json();
  const candidates = result.candidates;
  
  if (candidates && candidates.length > 0 && candidates[0].content?.parts?.length > 0) {
    return candidates[0].content.parts[0].text.trim();
  } else {
    throw new Error("유효한 API 응답을 받지 못했습니다.");
  }
}
