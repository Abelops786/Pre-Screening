// Reading passages for the ~30-second voice screening, keyed by language.
// Each passage is a short, neutral paragraph the candidate reads aloud so we can
// assess fluency in the target language. Languages without a curated passage
// fall back to a free-speech prompt in that language (see getReadingTask).

export const READING_PASSAGES: Record<string, string> = {
  English:
    'Thank you for taking the time to complete this short recording. Please read this paragraph clearly and at a natural pace. Good communication means speaking calmly, listening carefully, and helping each person feel understood. We appreciate your interest in joining our team and look forward to learning more about you.',
  Spanish:
    'Gracias por tomarse el tiempo para completar esta breve grabación. Por favor, lea este párrafo con claridad y a un ritmo natural. Una buena comunicación significa hablar con calma, escuchar con atención y ayudar a que cada persona se sienta comprendida. Agradecemos su interés en unirse a nuestro equipo.',
  French:
    'Merci de prendre le temps de réaliser ce court enregistrement. Veuillez lire ce paragraphe clairement et à un rythme naturel. Une bonne communication, c’est parler avec calme, écouter attentivement et aider chaque personne à se sentir comprise. Nous vous remercions de votre intérêt pour notre équipe.',
  'French US Based':
    'Merci de prendre le temps de réaliser ce court enregistrement. Veuillez lire ce paragraphe clairement et à un rythme naturel. Une bonne communication, c’est parler avec calme, écouter attentivement et aider chaque personne à se sentir comprise. Nous vous remercions de votre intérêt pour notre équipe.',
  Portuguese:
    'Obrigado por dedicar o seu tempo para concluir esta breve gravação. Por favor, leia este parágrafo com clareza e num ritmo natural. Uma boa comunicação significa falar com calma, ouvir com atenção e ajudar cada pessoa a sentir-se compreendida. Agradecemos o seu interesse em juntar-se à nossa equipa.',
  Italian:
    'Grazie per aver dedicato del tempo a completare questa breve registrazione. Per favore, leggi questo paragrafo in modo chiaro e a un ritmo naturale. Una buona comunicazione significa parlare con calma, ascoltare con attenzione e far sentire ogni persona compresa. Ti ringraziamo per il tuo interesse.',
  German:
    'Vielen Dank, dass Sie sich die Zeit für diese kurze Aufnahme nehmen. Bitte lesen Sie diesen Absatz deutlich und in einem natürlichen Tempo. Gute Kommunikation bedeutet, ruhig zu sprechen, aufmerksam zuzuhören und jeder Person das Gefühl zu geben, verstanden zu werden. Wir freuen uns über Ihr Interesse.',
  Arabic:
    'شكرًا لك على الوقت الذي خصصته لإكمال هذا التسجيل القصير. يرجى قراءة هذه الفقرة بوضوح وبوتيرة طبيعية. التواصل الجيد يعني التحدث بهدوء والاستماع بعناية ومساعدة كل شخص على الشعور بأنه مفهوم. نشكرك على اهتمامك بالانضمام إلى فريقنا.',
  Urdu:
    'یہ مختصر ریکارڈنگ مکمل کرنے کے لیے وقت نکالنے کا شکریہ۔ براہ کرم اس پیراگراف کو واضح اور فطری رفتار سے پڑھیں۔ اچھی بات چیت کا مطلب ہے سکون سے بات کرنا، توجہ سے سننا اور ہر فرد کو یہ احساس دلانا کہ اسے سمجھا گیا ہے۔ ہماری ٹیم میں شامل ہونے میں دلچسپی کا شکریہ۔',
  Hindi:
    'इस छोटी रिकॉर्डिंग को पूरा करने के लिए समय निकालने हेतु धन्यवाद। कृपया इस अनुच्छेद को स्पष्ट रूप से और स्वाभाविक गति से पढ़ें। अच्छा संवाद का अर्थ है शांति से बोलना, ध्यान से सुनना और हर व्यक्ति को यह महसूस कराना कि उसे समझा गया है। हमारी टीम में रुचि के लिए धन्यवाद।',
  Russian:
    'Спасибо, что нашли время сделать эту короткую запись. Пожалуйста, прочитайте этот абзац чётко и в естественном темпе. Хорошее общение означает говорить спокойно, внимательно слушать и помогать каждому человеку чувствовать себя понятым. Мы благодарим вас за интерес к нашей команде.',
  Mandarin:
    '感谢您抽出时间完成这段简短的录音。请清晰地、以自然的语速朗读这段文字。良好的沟通意味着平静地说话、认真地倾听，并让每个人都感到被理解。我们感谢您有兴趣加入我们的团队。',
  Cantonese:
    '多謝你抽時間完成呢段簡短嘅錄音。請清晰咁、用自然嘅語速朗讀呢段文字。良好嘅溝通即係冷靜咁講嘢、用心咁聆聽，令每個人都覺得被理解。多謝你有興趣加入我哋嘅團隊。',
  Turkish:
    'Bu kısa kaydı tamamlamak için zaman ayırdığınız için teşekkür ederiz. Lütfen bu paragrafı net bir şekilde ve doğal bir hızda okuyun. İyi iletişim; sakin konuşmak, dikkatle dinlemek ve her bireyin anlaşıldığını hissetmesine yardımcı olmaktır. Ekibimize ilginiz için teşekkürler.',
  Indonesian:
    'Terima kasih telah meluangkan waktu untuk menyelesaikan rekaman singkat ini. Silakan baca paragraf ini dengan jelas dan dengan kecepatan yang wajar. Komunikasi yang baik berarti berbicara dengan tenang, mendengarkan dengan saksama, dan membantu setiap orang merasa dipahami. Terima kasih atas minat Anda.',
  Tagalog:
    'Salamat sa paglalaan ng oras upang kumpletuhin ang maikling pagre-record na ito. Pakibasa ang talatang ito nang malinaw at sa natural na bilis. Ang mahusay na komunikasyon ay nangangahulugang mahinahong pagsasalita, maingat na pakikinig, at pagtulong sa bawat tao na maramdamang naiintindihan. Salamat sa iyong interes.',
  Vietnamese:
    'Cảm ơn bạn đã dành thời gian hoàn thành bản ghi âm ngắn này. Vui lòng đọc đoạn văn này một cách rõ ràng và với tốc độ tự nhiên. Giao tiếp tốt nghĩa là nói chuyện bình tĩnh, lắng nghe cẩn thận và giúp mỗi người cảm thấy được thấu hiểu. Cảm ơn bạn đã quan tâm đến đội ngũ của chúng tôi.',
  Bengali:
    'এই সংক্ষিপ্ত রেকর্ডিংটি সম্পূর্ণ করার জন্য সময় দেওয়ার জন্য আপনাকে ধন্যবাদ। অনুগ্রহ করে এই অনুচ্ছেদটি স্পষ্টভাবে এবং স্বাভাবিক গতিতে পড়ুন। ভালো যোগাযোগ মানে শান্তভাবে কথা বলা, মনোযোগ দিয়ে শোনা এবং প্রত্যেককে বোঝার অনুভূতি দেওয়া। আমাদের দলে আগ্রহের জন্য ধন্যবাদ।',
  Korean:
    '이 짧은 녹음을 완료하는 데 시간을 내주셔서 감사합니다. 이 문단을 또렷하게 자연스러운 속도로 읽어 주세요. 좋은 소통이란 차분하게 말하고, 주의 깊게 듣고, 모든 사람이 이해받는다고 느끼도록 돕는 것입니다. 저희 팀에 관심을 가져 주셔서 감사합니다.',
};

const TOPIC =
  'your most recent work experience, your key responsibilities, and why you are a strong candidate for this role';

export interface ReadingTask {
  mode: 'read' | 'speak';
  language: string;
  passage: string;   // text to read, or the topic prompt for free speech
  instruction: string;
}

// Resolve the reading task for a given language. If we have a curated passage,
// the candidate reads it; otherwise they speak freely in that language.
export function getReadingTask(language?: string | null): ReadingTask {
  const lang = (language || 'English').trim();
  const passage = READING_PASSAGES[lang];
  if (passage) {
    return {
      mode: 'read',
      language: lang,
      passage,
      instruction: `Please read the following paragraph aloud in ${lang} for about 30 seconds, clearly and at a natural pace.`,
    };
  }
  return {
    mode: 'speak',
    language: lang,
    passage: TOPIC,
    instruction: `Please speak in ${lang} for about 30 seconds about ${TOPIC}. Speak naturally and clearly.`,
  };
}
