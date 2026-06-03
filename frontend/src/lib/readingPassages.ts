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
  Acholi:
    'Apwoyo tic pi cawa ma itero me tyeko goyo dwon man machiek. Tim kica ikwan paragraph man maleng ki i rwom ma kwaye. Nyamo lok maber te tye ni lok motmot, winyo lok maber, ki konyo dano ducu me winyo lok. Wapwoyo miti ni me donyo i timwa ci wageno pwonyo mapol ikomi.',
  Afrikaans:
    "Dankie dat u die tyd geneem het om hierdie kort opname te voltooi. Lees asseblief hierdie paragraaf duidelik en teen 'n natuurlike pas. Goeie kommunikasie beteken om kalm te praat, aandagtig te luister en om elke persoon te help om verstaan te voel. Ons waardeer u belangstelling om by ons span aan te sluit en sien uit daarna om meer van u te leer.",
  Albanian:
    "Faleminderit që gjetët kohë për të përfunduar këtë regjistrim të shkurtër. Ju lutemi lexoni këtë paragraf qartë dhe me një ritëm natyral. Komunikimi i mirë do të thotë të flasësh me qetësi, të dëgjosh me vëmendje dhe të ndihmosh çdo person të ndihet i kuptuar. Ne vlerësojmë interesin tuaj për t'iu bashkuar ekipit tonë dhe presim të mësojmë më shumë rreth jush.",
  ASL:
    'Thank you for taking the time to complete this short recording. Please read this paragraph clearly and at a natural pace. Good communication means speaking calmly, listening carefully, and helping each person feel understood. We appreciate your interest in joining our team and look forward to learning more about you.',
  Azerbaijani:
    "Bu qısa səsyazmanı tamamlamağa vaxt ayırdığınız üçün təşəkkür edirik. Zəhmət olmasa, bu abzasını aydın və təbii sürətdə oxuyun. Yaxşı ünsiyyət sakit danışmaq, diqqətlə dinləmək və hər bir şəxsin anlaşıldığını hiss etməsinə kömək etmək deməkdir. Komandamıza qoşulmağa göstərdiyiniz marağı qiymətləndiririk və sizin haqqınızda daha çox öyrənməyi səbirsizliklə gözləyirik.",
  Burmese:
    "ဤတိုတောင်းသော အသံဖမ်းယူမှုကို ပြီးမြောက်ရန် အချိန်ပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်။ ကျေးဇူးပြု၍ ဤစာပိုဒ်ကို ရှင်းလင်းစွာနှင့် သဘာဝကျသော အမြန်နှုန်းဖြင့် ဖတ်ပါ။ ကောင်းမွန်သော ဆက်သွယ်ရေးဆိုသည်မှာ တည်ငြိမ်စွာပြောဆိုခြင်း၊ ဂရုတစိုက်နားထောင်ခြင်းနှင့် လူတိုင်းကို နားလည်ခံရသည်ဟု ခံစားရစေရန် ကူညီပေးခြင်းဖြစ်သည်။ ကျွန်ုပ်တို့၏အဖွဲ့တွင် ပါဝင်ရန် သင်၏စိတ်ဝင်စားမှုကို ကျွန်ုပ်တို့တန်ဖိုးထားပြီး သင်၏အကြောင်းကို ပိုမိုသိရှိရန် မျှော်လင့်ပါသည်။",
  'Cambodian (Khmer)':
    "សូមអរគុណដែលបានចំណាយពេលដើម្បីបញ្ចប់ការថតសំឡេងដ៏ខ្លីនេះ។ សូមអានកថាខណ្ឌនេះឱ្យបានច្បាស់លាស់ និងក្នុងល្បឿនធម្មជាតិ។ ការប្រាស្រ័យទាក់ទងល្អមានន័យថាការនិយាយដោយស្ងប់ស្ងាត់ ការស្តាប់ដោយយកចិត្តទុកដាក់ និងជួយឱ្យមនុស្សម្នាក់ៗមានអារម្មណ៍ថាត្រូវបានគេយល់។ យើងខ្ញុំសូមកោតសរសើរចំពោះចំណាប់អារម្មណ៍របស់អ្នកក្នុងការចូលរួមជាមួយក្រុមរបស់យើង ហើយទន្ទឹងរង់ចាំស្វែងយល់បន្ថែមអំពីអ្នក។",
  Gujarati:
    "આ ટૂંકું રેકોર્ડિંગ પૂર્ણ કરવા માટે સમય કાઢવા બદલ તમારો આભાર. કૃપા કરીને આ ફકરાને સ્પષ્ટ રીતે અને સ્વાભાવિક ગતિએ વાંચો. સારા સંચારનો અર્થ છે શાંતિથી બોલવું, ધ્યાનથી સાંભળવું, અને દરેક વ્યક્તિને સમજાયું હોય તેવું અનુભવવામાં મદદ કરવી. અમારી ટીમમાં જોડાવાના તમારા રસની અમે કદર કરીએ છીએ અને તમારા વિશે વધુ જાણવા માટે આતુર છીએ.",
  'Haitian Creole':
    "Mèsi paske ou pran tan ou pou ranpli anrejistreman kout sa a. Tanpri li paragraf sa a klèman epi nan yon vitès natirèl. Bon kominikasyon vle di pale avèk kalm, koute ak atansyon, epi ede chak moun santi yo konprann yo. Nou apresye enterè ou genyen pou w vin jwenn ekip nou an epi nou espere aprann plis sou ou.",
  Hmong:
    "Ua tsaug rau koj lub sijhawm los ua qhov kev kaw suab luv luv no. Thov nyeem kab lus no kom meej thiab raws li koj lub suab niaj hnub. Kev sib txuas lus zoo txhais tau tias hais lus twj ywm, ua tib zoo mloog, thiab pab txhua tus kom xav tias lawv to taub. Peb txaus siab rau koj qhov kev xav koom nrog peb pab pawg thiab nrhiav kev xav paub ntxiv txog koj.",
  Laotian:
    "ຂໍຂອບໃຈທີ່ສະຫຼະເວລາເພື່ອເຮັດການບັນທຶກສຽງສັ້ນໆນີ້. ກະລຸນາອ່ານວັກນີ້ໃຫ້ຊັດເຈນ ແລະ ດ້ວຍຄວາມໄວທີ່ເປັນທຳມະຊາດ. ການສື່ສານທີ່ດີໝາຍເຖິງການເວົ້າຢ່າງສະຫງົບ, ການຟັງຢ່າງລະມັດລະວັງ, ແລະ ຊ່ວຍໃຫ້ແຕ່ລະຄົນຮູ້ສຶກວ່າເຂົ້າໃຈ. ພວກ​ເຮົາ​ຮູ້​ບຸນ​ຄຸນ​ຕໍ່​ຄວາມ​ສົນ​ໃຈ​ຂອງ​ທ່ານ​ໃນ​ການ​ເຂົ້າ​ຮ່ວມ​ທີມ​ງານ​ຂອງ​ພວກ​ເຮົາ ແລະ ຫວັງ​ວ່າ​ຈະ​ໄດ້​ຮຽນ​ຮູ້​ເພີ່ມ​ເຕີມ​ກ່ຽວ​ກັບ​ທ່ານ.",
  Lingala:
    "Matondi mpo na kozwa ntango ya kosilisa enregistrement oyo ya mokuse. Tosengi yo otanga paragraphe oyo na polele mpe na rythme ya normal. Communication malamu elakisi koloba na kimia, koyoka na likebi, mpe kosalisa moto nyonso amiyoka ete basosoli ye. Tozali na botondi mpo na mposa na yo ya kokota na ekipe na biso mpe tozali kozela koyeba makambo ebele na ntina na yo.",
  Marshallese:
    "Kommool tata kōn am bōk iien eo am ñan kadedeikļo̧k reko̧t in ekadu. Joij im riiti paragrap in kōn juon ainikien em̧m̧an im alikkar. Kōm̧m̧an bwe en em̧m̧an am̧ kōnono im roñjake eļap, im jipan̄ aolep armej bwe ren meļeļe. Kōmij kaorōk am̧ itok limomo in koba tok ilo tiim in am im kōmij kōttar ñan bar jeļā eļapļo̧k kōn kwe.",
  Pashto:
    "مننه چې د دې لنډ ریکارډ بشپړولو لپاره مو وخت واخیست. مهرباني وکړئ دا پراګراف په واضح ډول او په طبیعي سرعت ولولئ. ښه اړیکه پدې معنی ده چې په آرامۍ سره خبرې کول، په غور سره اوریدل، او د هر شخص سره مرسته کول چې د پوهیدو احساس وکړي. موږ زموږ په ټیم کې د یوځای کیدو لپاره ستاسو د علاقې ستاینه کوو او ستاسو په اړه نور معلومات زده کولو ته سترګې په لار یو.",
  Rohingya:
    "Shukuria tuari yian record goribar loi shomoi diyar baabote. Meherbaani gori yian paragraph ekan forishkar gori ar nize matho de dhoilla foro. Gom communication or maani oilo araame hota hoon, dian di funon, ar fotti zonore buzi fari foin modot goron. Anara tuar team ot aaiyar eitta kodor gori ar tuar baabote aroi zanibar asha gori.",
  Slovenian:
    "Hvala, ker ste si vzeli čas za ta kratek posnetek. Prosimo, preberite ta odstavek jasno in v naravnem ritmu. Dobra komunikacija pomeni mirno govorjenje, pozorno poslušanje in pomoč vsaki osebi, da se počuti razumljeno. Cenimo vaše zanimanje za pridružitev naši ekipi in se veselimo, da vas bomo bolje spoznali.",
  Somali:
    "Waad ku mahadsan tahay inaad waqti siisay dhamaystirka duubistaan gaaban. Fadlan si cad u akhri cutubkan adigoo ku hadlaya xawaare dabiici ah. Isgaarsiinta wanaagsan macnaheedu waa inaad si degan u hadasho, si taxadar leh wax u dhegeysato, oo aad caawiso qof walba inuu dareemo in la fahmay. Waxaan ka mahadcelineynaa xiisaha aad u qabto ku biirista kooxdeena waxaana rajeyneynaa inaan wax badan kaa ogaano.",
  Swahili:
    "Asante kwa kutenga muda wa kukamilisha rekodi hii fupi. Tafadhali soma aya hii kwa ufasaha na kwa mwendo wa kawaida. Mawasiliano mazuri yanamaanisha kuzungumza kwa utulivu, kusikiliza kwa makini, na kusaidia kila mtu kuhisi ameeleweka. Tunathamini nia yako ya kujiunga na timu yetu na tunatarajia kufahamu zaidi kukuhusu.",
  Ukrainian:
    "Дякуємо, що знайшли час зробити цей короткий запис. Будь ласка, прочитайте цей абзац чітко та в природному темпі. Хороше спілкування означає говорити спокійно, уважно слухати та допомагати кожній людині відчувати себе зрозумілою. Ми цінуємо ваш інтерес до приєднання до нашої команди та з нетерпінням чекаємо на можливість дізнатися про вас більше.",
  Wolof:
    "Jërëjëf ci sa jot bi nga jël ngir mottali woy wii di lu gàtt. Ñu ngi lay ñaan nga jàng kàddu yii ci anam gu leer te am na mbégte ci sa anam gu nàqari. Jëflante gu baax dafa tekki wax ci anam gu dal, déglu bu baax, te jàppale nit ku nekk ba mu yëg ne ñu ngi koy dégg. Ñu ngi rafetlu sa yàtte ci bokk ci sunu mbooloo te ñu ngi xaar di xam lu bari ci yaw.",
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
