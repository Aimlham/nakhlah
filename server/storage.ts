import { type User, type InsertUser, type Product, type InsertProduct, type SavedProduct, type InsertSavedProduct, type ProductAd } from "@shared/schema";
import { randomUUID } from "crypto";
import { supabaseConfigured } from "./supabase";
import { SupabaseStorage } from "./supabase-storage";
import { getMockAds } from "./mock-ads";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getSavedProductIds(userId: string): Promise<string[]>;
  getSavedProducts(userId: string): Promise<Product[]>;
  saveProduct(userId: string, productId: string): Promise<SavedProduct>;
  unsaveProduct(userId: string, productId: string): Promise<void>;
  createProduct(product: InsertProduct): Promise<Product>;
  getAdsByProductId(productId: string): Promise<ProductAd[]>;
  getAllAds(): Promise<ProductAd[]>;
  updateProductAiSummary(productId: string, aiSummary: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private savedProducts: Map<string, SavedProduct>;
  private ads: Map<string, ProductAd>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.savedProducts = new Map();
    this.ads = new Map();
    this.seedProducts();
    this.seedAds();
  }

  private seedProducts() {
    const mockProducts: Omit<Product, "id" | "createdAt">[] = [
      {
        title: "مصباح إسقاط غروب الشمس LED",
        imageUrl: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=400&fit=crop",
        shortDescription: "مصباح غروب شمس منتشر على تيك توك يخلق إضاءة دافئة ومريحة. مثالي لصنّاع المحتوى ومحبي ديكور المنزل.",
        category: "المنزل والمعيشة",
        niche: "إضاءة مميزة",
        sourcePlatform: "AliExpress",
        supplierPrice: "8.50",
        suggestedSellPrice: "34.99",
        estimatedMargin: "75.7",
        trendScore: 92,
        saturationScore: 35,
        opportunityScore: 88,
        aiSummary: JSON.stringify({ whyPromising: "هذا المنتج رائج بقوة على تيك توك وإنستغرام مع أكثر من 50 مليون مشاهدة. الجاذبية البصرية تجعله مثالياً للتسويق عبر السوشيال ميديا، وتكلفة المورّد المنخفضة تتيح هوامش ربح ممتازة.", targetAudience: "جيل Z والألفية من عمر 18-30 المهتمين بديكور الغرف الأنيق وصناعة المحتوى.", adAngles: ["حوّل غرفتك لجنة الساعة الذهبية", "المصباح الذي كسر تيك توك - متاح الآن بخصم 60%", "صنّاع المحتوى مهووسون بهذا المصباح"], hooks: ["لما حوّلت غرفتي المملة لفايب مختلف تماماً", "هذا المصباح بـ35$ يخلي غرفتك تبان ستوديو تصوير بـ5000$", "كنت متردد لين شفت غرفتي تضوي كذا"] }),
        supplierLink: "https://aliexpress.com/item/example1",
      },
      {
        title: "خلاط محمول بشحن USB",
        imageUrl: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&h=400&fit=crop",
        shortDescription: "خلاط شخصي قابل للشحن يصنع السموذي في أي مكان. شحن USB-C، سعة 380 مل، مواد خالية من BPA.",
        category: "المطبخ",
        niche: "الصحة واللياقة",
        sourcePlatform: "AliExpress",
        supplierPrice: "6.20",
        suggestedSellPrice: "29.99",
        estimatedMargin: "79.3",
        trendScore: 85,
        saturationScore: 42,
        opportunityScore: 82,
        aiSummary: JSON.stringify({ whyPromising: "الصحة واللياقة لا تزال ترند ضخم. الخلاطات المحمولة تحل مشكلة حقيقية لرواد الجيم والمهنيين المشغولين الذين يريدون سموذي طازج بدون معدات ضخمة.", targetAudience: "عشاق اللياقة، رواد الجيم، المهنيون المشغولون من 22-40 سنة.", adAngles: ["سموذي طازج في أي مكان - بدون كهرباء", "الأساسي في شنطة الجيم لكل محب للياقة", "توقف عن شراء سموذي بـ8$ وإصنعه بـ1$"], hooks: ["أسوي بروتين شيك في سيارتي الحين", "هذا الخلاط الصغير عوّض خلاطي الكبير بـ200$", "أصحابي بالجيم يسألوني وش هذا الجهاز"] }),
        supplierLink: "https://aliexpress.com/item/example2",
      },
      {
        title: "مرآة LED بشكل سحابة",
        imageUrl: "https://images.unsplash.com/photo-1616627577385-5c0c4dab55a5?w=400&h=400&fit=crop",
        shortDescription: "مرآة تسريحة أنيقة بشكل سحابة مع إضاءة LED مدمجة. تحكم باللمس بالسطوع، تعمل بـUSB، مثالية للمكياج والسيلفي.",
        category: "ديكور المنزل",
        niche: "التجميل والزينة",
        sourcePlatform: "AliExpress",
        supplierPrice: "12.80",
        suggestedSellPrice: "44.99",
        estimatedMargin: "71.5",
        trendScore: 78,
        saturationScore: 28,
        opportunityScore: 85,
        aiSummary: JSON.stringify({ whyPromising: "ديكور السحب يعيش لحظة ذهبية في مجتمع الأناقة والكوتيج كور. التشبّع المنخفض يعني ميزة للمبكرين. وظيفة LED تضيف قيمة عملية فوق الديكور.", targetAudience: "الشابات من 16-28 المهتمات بديكور الغرف الأنيق والتسريحة والسيلفي.", adAngles: ["تسريحتك تستاهل ترقية مرآة السحابة", "المرآة الأنيقة التي تخلي كل سيلفي مثالي", "إضاءة حالمة تلتقي بأناقة السحب"], hooks: ["تسريحتي صارت تستاهل بنترست بسبب هذي", "المرآة اللي خلتني أبي أسوي مكياج فعلاً", "كل واحد يزورني يسأل عن مرآة السحابة"] }),
        supplierLink: "https://aliexpress.com/item/example3",
      },
      {
        title: "حامل جوال مغناطيسي MagSafe للسيارة",
        imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop",
        shortDescription: "حامل مغناطيسي قوي متوافق مع MagSafe. دوران 360 درجة، تشغيل بيد واحدة، يناسب جميع فتحات التكييف.",
        category: "إلكترونيات",
        niche: "إكسسوارات السيارات",
        sourcePlatform: "AliExpress",
        supplierPrice: "3.90",
        suggestedSellPrice: "24.99",
        estimatedMargin: "84.4",
        trendScore: 74,
        saturationScore: 55,
        opportunityScore: 68,
        aiSummary: JSON.stringify({ whyPromising: "مع انتشار MagSafe بسرعة، حوامل السيارة المغناطيسية أصبحت إكسسوار أساسي. تكلفة المورّد المنخفضة جداً تتيح تسعير تنافسي مع الحفاظ على هوامش عالية.", targetAudience: "مستخدمو آيفون من 25-45 سنة الذين يقودون سيارات ويريدون حلول هاندز فري.", adAngles: ["حامل السيارة الوحيد اللي فعلاً يمسك جوالك بقوة", "MagSafe يلتقي بطبلون سيارتك - التركيبة المثالية", "توقف عن التخبط بجوالك وأنت تسوق"], hooks: ["أخيراً لقيت حامل سيارة ما يطيح", "جوالي يلتصق بمكانه مثل السحر", "هذا الإكسسوار بـ25$ خلا رحلتي أأمن 10 مرات"] }),
        supplierLink: "https://aliexpress.com/item/example4",
      },
      {
        title: "طابعة حرارية صغيرة محمولة",
        imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=400&fit=crop",
        shortDescription: "طابعة حرارية لاسلكية بحجم الجيب. اطبع صور وملصقات وملاحظات من جوالك عبر البلوتوث. بدون حبر.",
        category: "إلكترونيات",
        niche: "قرطاسية وأجهزة",
        sourcePlatform: "1688",
        supplierPrice: "15.40",
        suggestedSellPrice: "49.99",
        estimatedMargin: "69.2",
        trendScore: 88,
        saturationScore: 30,
        opportunityScore: 86,
        aiSummary: JSON.stringify({ whyPromising: "الطابعات الصغيرة منتشرة بقوة على تيك توك للمذكرات واليوميات والملصقات. تقنية بدون حبر نقطة بيع قوية. التشبّع المنخفض يمثل فرصة كبيرة.", targetAudience: "الطلاب وعشاق اليوميات والأعمال اليدوية من 16-35 سنة.", adAngles: ["اطبع ذكرياتك من جوالك بثواني", "أداة اليوميات التي غيّرت إنتاجيتي", "بدون حبر، بدون فوضى، طباعة فورية"], hooks: ["أطبع قائمة مهامي وألصقها في كل مكان", "هذي الطابعة الصغيرة تدخل جيبي وتطبع أي شي", "يومياتي تحولت من مملة لأنيقة بهذا الجهاز"] }),
        supplierLink: "https://1688.com/item/example5",
      },
      {
        title: "حزام تصحيح القوام القابل للتعديل",
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
        shortDescription: "مصحح قوام غير مرئي تحت الملابس بأحزمة قابلة للتعديل. يساعد على تقليل آلام الظهر وتحسين وضعية الجلوس.",
        category: "الصحة والعافية",
        niche: "بيئة العمل",
        sourcePlatform: "AliExpress",
        supplierPrice: "4.10",
        suggestedSellPrice: "27.99",
        estimatedMargin: "85.4",
        trendScore: 70,
        saturationScore: 48,
        opportunityScore: 72,
        aiSummary: JSON.stringify({ whyPromising: "العمل عن بعد خلق سوق ضخم لمنتجات تصحيح القوام. التصميم غير المرئي يحل مشكلة الإحراج من لبس المصحح. هوامش ربح عالية تجعله مربحاً جداً.", targetAudience: "العاملون عن بعد، موظفو المكاتب، والطلاب من 22-50 سنة.", adAngles: ["صحح قوامك بدون ما أحد يدري إنك لابسه", "الدعم الخفي للظهر للعاملين على المكاتب", "تصحيح قوام موصى به من الأطباء بأقل من 30$"], hooks: ["آلام ظهري اختفت بعد أسبوعين من لبس هذا", "ما أحد بالشغل يدري إني لابس مصحح قوام", "ياليتني لقيته من زمان - قوامي أخيراً تعدّل"] }),
        supplierLink: "https://aliexpress.com/item/example6",
      },
      {
        title: "منظم مكياج دوّار",
        imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
        shortDescription: "منظم مكياج دوّار 360 درجة بأرفف قابلة للتعديل. يتسع للعناية بالبشرة والمكياج والفرش والعطور. تصميم أكريليك شفاف.",
        category: "الجمال",
        niche: "التنظيم والتخزين",
        sourcePlatform: "AliExpress",
        supplierPrice: "9.70",
        suggestedSellPrice: "39.99",
        estimatedMargin: "75.7",
        trendScore: 65,
        saturationScore: 40,
        opportunityScore: 70,
        aiSummary: JSON.stringify({ whyPromising: "تنظيم منتجات التجميل نيتش دائم الطلب. خاصية الدوران تضيف جاذبية وقيمة عملية. إمكانية كهدية تزيد المبيعات الموسمية.", targetAudience: "النساء من 18-40 سنة مع مجموعات مكياج متزايدة يريدون عرض أنيق.", adAngles: ["كل منتجات تجميلك في منظم دوّار واحد", "ترقية التسريحة التي توفر عليك 10 دقائق كل صباح", "فكرة هدية بتستخدمها فعلاً كل يوم"], hooks: ["أخيراً أقدر أشوف كل مكياجي بدل ما أنبش بالأدراج", "هذا المنظم خلا حمامي يبان مثل سيفورا", "أحسن 40$ صرفتهم على التنظيم"] }),
        supplierLink: "https://aliexpress.com/item/example7",
      },
      {
        title: "زجاجة مياه ذكية بشاشة حرارة",
        imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
        shortDescription: "زجاجة مياه ذكية معزولة بشاشة LED لدرجة الحرارة. تذكّرك بشرب الماء. تحافظ على الحرارة 12 ساعة والبرودة 24 ساعة.",
        category: "المطبخ",
        niche: "الصحة والترطيب",
        sourcePlatform: "1688",
        supplierPrice: "7.30",
        suggestedSellPrice: "32.99",
        estimatedMargin: "77.9",
        trendScore: 80,
        saturationScore: 38,
        opportunityScore: 79,
        aiSummary: JSON.stringify({ whyPromising: "منتجات الترطيب الذكية تنمو مع زيادة الوعي الصحي. شاشة الحرارة ميزة تنافسية قوية. يجمع بين جاذبية التقنية والفوائد الصحية.", targetAudience: "البالغون الواعون صحياً من 20-45 سنة، عشاق اللياقة، والمهنيون المهتمون بالتقنية.", adAngles: ["ما تشرب قهوة فاترة مرة ثانية", "زجاجة المياه التي تخبرك بدرجة الحرارة بالضبط", "ترطيب ذكي للناس اللي تنسى تشرب ماء"], hooks: ["ما صدقت إن زجاجة مياه ممكن تكون 'ذكية' لين جربت هذي", "هذي الزجاجة تقولي درجة حرارة شربي بالضبط", "قهوتي لا تزال حارة بعد 8 ساعات - كيف؟!"] }),
        supplierLink: "https://1688.com/item/example8",
      },
      {
        title: "طقم قلم تنظيف سماعات لاسلكية",
        imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop",
        shortDescription: "أداة تنظيف 3 في 1 لسماعات AirPods والسماعات اللاسلكية وعلب الشحن. فرشاة ناعمة ورأس إسفنج ونقطة معدنية.",
        category: "إلكترونيات",
        niche: "إكسسوارات",
        sourcePlatform: "AliExpress",
        supplierPrice: "1.20",
        suggestedSellPrice: "14.99",
        estimatedMargin: "92.0",
        trendScore: 76,
        saturationScore: 32,
        opportunityScore: 80,
        aiSummary: JSON.stringify({ whyPromising: "مع بيع مليارات السماعات اللاسلكية، سوق إكسسوارات التنظيف ضخم وغير مخدوم. تكلفة البضاعة المنخفضة جداً تعني هوامش ربح لا تصدق. سعر شراء عفوي سهل.", targetAudience: "ملاك سماعات AirPods والسماعات اللاسلكية من 16-45 سنة.", adAngles: ["سماعاتك أوسخ مما تتخيل", "الأداة بـ15$ التي تخلي سماعاتك تسمع مثل الجديدة", "نظف سماعاتك صح لأول مرة"], hooks: ["نظفت سماعاتي وكمية الأوساخ كانت مقرفة!", "ليش ما أحد قالي عن أداة التنظيف هذي من قبل؟", "سماعاتي صارت تسمع أحسن بعد ما استخدمت هذي - بجد"] }),
        supplierLink: "https://aliexpress.com/item/example9",
      },
      {
        title: "فرشاة إزالة شعر الحيوانات ذاتية التنظيف",
        imageUrl: "https://images.unsplash.com/photo-1583337130417-13104dec14a7?w=400&h=400&fit=crop",
        shortDescription: "بكرة وبر قابلة لإعادة الاستخدام بقاعدة تنظيف ذاتي. تزيل شعر الحيوانات من الملابس والأثاث ومقاعد السيارة فوراً.",
        category: "مستلزمات الحيوانات",
        niche: "التنظيف",
        sourcePlatform: "AliExpress",
        supplierPrice: "3.50",
        suggestedSellPrice: "19.99",
        estimatedMargin: "82.5",
        trendScore: 72,
        saturationScore: 45,
        opportunityScore: 74,
        aiSummary: JSON.stringify({ whyPromising: "ملكية الحيوانات الأليفة وصلت أرقام قياسية. شعر الحيوانات مشكلة عامة لكل مالكي الحيوانات. ميزة التنظيف الذاتي تلغي الحاجة لأوراق بديلة.", targetAudience: "مالكو الحيوانات الأليفة من 25-55 سنة، خصوصاً مالكي القطط والكلاب.", adAngles: ["أخيراً بكرة وبر تشتغل فعلاً على شعر الحيوانات", "بدون أوراق لاصقة - هذي الفرشاة تنظف نفسها", "مالكو الحيوانات يقولون أحسن 20$ صرفوها"], hooks: ["شوف هذي الفرشاة تشيل كل شعر الحيوان بمسحة وحدة", "رميت بكرات الوبر كلها بعد ما جبت هذي", "كنبتي صارت تبان جديدة وعندي قطتين"] }),
        supplierLink: "https://aliexpress.com/item/example10",
      },
      {
        title: "طقم زجاجات سيليكون قابلة للطي للسفر",
        imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=400&fit=crop",
        shortDescription: "زجاجات سيليكون قابلة للطي معتمدة للطيران. مانعة للتسرب، خالية من BPA، تنطوي بشكل مسطح لتوفير المساحة.",
        category: "السفر",
        niche: "مستلزمات السفر",
        sourcePlatform: "1688",
        supplierPrice: "2.80",
        suggestedSellPrice: "18.99",
        estimatedMargin: "85.3",
        trendScore: 68,
        saturationScore: 50,
        opportunityScore: 66,
        aiSummary: JSON.stringify({ whyPromising: "السفر يتعافى بقوة. ميزة الاعتماد للطيران والقابلية للطي تحل مشاكل التعبئة الحقيقية. التكلفة المنخفضة تتيح استراتيجيات الحزم لقيمة طلب أعلى.", targetAudience: "المسافرون الدائمون من 25-50 سنة، البدو الرقميون، وعشاق الإجازات.", adAngles: ["زجاجات معتمدة للطيران تنطوي فعلاً بشكل مسطح", "سافر خفيف مع الزجاجات القابلة للطي", "الحيلة السفرية التي يقسم عليها طاقم الطيران"], hooks: ["كل أدوات النظافة دخلت بهالشنطة الصغيرة", "هذي الزجاجات تنطوي مسطحة - شنطتي صار فيها مساحة أكثر", "أمن المطار ما علّق عليها أبداً"] }),
        supplierLink: "https://1688.com/item/example11",
      },
      {
        title: "ماوس باد RGB للقيمنق حجم XXL",
        imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=400&fit=crop",
        shortDescription: "ماوس باد LED بحجم كبير مع 14 وضع إضاءة. سطح مقاوم للماء، قاعدة مطاطية مانعة للانزلاق. 800×300 ملم.",
        category: "إلكترونيات",
        niche: "الألعاب",
        sourcePlatform: "AliExpress",
        supplierPrice: "8.90",
        suggestedSellPrice: "36.99",
        estimatedMargin: "75.9",
        trendScore: 82,
        saturationScore: 52,
        opportunityScore: 73,
        aiSummary: JSON.stringify({ whyPromising: "سوق إكسسوارات القيمنق يستمر بالنمو مع صعود ألعاب الكمبيوتر والبث المباشر. منتجات RGB تؤدي أداء استثنائي على السوشيال ميديا. الحجم XXL يوفر حماية للمكتب وقيمة جمالية.", targetAudience: "اللاعبين وعشاق الكمبيوتر من 16-35 سنة الذين يريدون تحسين سيتأب مكتبهم.", adAngles: ["حوّل مكتبك الممل لمحطة قيمنق احترافية", "ماوس باد RGB اللي يخلي أي سيتأب يبان برو", "14 وضع إضاءة يناسب أي مزاج أو لعبة"], hooks: ["سيتأب مكتبي انتقل من 0 لـ100 بشراء واحد", "إضاءة RGB على ماوس الباد هذا شي ثاني بالليل", "أحسن ترقية لأي سيتأب قيمنق بأقل من 40$"] }),
        supplierLink: "https://aliexpress.com/item/example12",
      },
    ];

    const dates = [
      new Date("2026-03-06"), new Date("2026-03-05"), new Date("2026-03-06"),
      new Date("2026-03-04"), new Date("2026-03-06"), new Date("2026-03-03"),
      new Date("2026-03-02"), new Date("2026-03-05"), new Date("2026-03-06"),
      new Date("2026-03-04"), new Date("2026-03-01"), new Date("2026-03-05"),
    ];

    mockProducts.forEach((p, i) => {
      const id = String(i + 1);
      this.products.set(id, { ...p, id, createdAt: dates[i] || new Date() });
    });
  }

  private seedAds() {
    getMockAds().forEach(ad => {
      this.ads.set(ad.id, ad);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      fullName: insertUser.fullName ?? null,
      email: insertUser.email ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getSavedProductIds(userId: string): Promise<string[]> {
    return Array.from(this.savedProducts.values())
      .filter(sp => sp.userId === userId)
      .map(sp => sp.productId);
  }

  async getSavedProducts(userId: string): Promise<Product[]> {
    const ids = await this.getSavedProductIds(userId);
    return ids.map(id => this.products.get(id)).filter(Boolean) as Product[];
  }

  async saveProduct(userId: string, productId: string): Promise<SavedProduct> {
    const key = `${userId}:${productId}`;
    const existing = this.savedProducts.get(key);
    if (existing) return existing;
    const sp: SavedProduct = {
      id: randomUUID(),
      userId,
      productId,
      createdAt: new Date(),
    };
    this.savedProducts.set(key, sp);
    return sp;
  }

  async unsaveProduct(userId: string, productId: string): Promise<void> {
    const key = `${userId}:${productId}`;
    this.savedProducts.delete(key);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = {
      id,
      title: product.title,
      imageUrl: product.imageUrl || null,
      shortDescription: product.shortDescription || null,
      category: product.category,
      niche: product.niche || null,
      sourcePlatform: product.sourcePlatform || null,
      supplierPrice: product.supplierPrice,
      suggestedSellPrice: product.suggestedSellPrice,
      estimatedMargin: product.estimatedMargin || null,
      trendScore: product.trendScore || null,
      saturationScore: product.saturationScore || null,
      opportunityScore: product.opportunityScore || null,
      aiSummary: product.aiSummary || null,
      supplierLink: product.supplierLink || null,
      createdAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getAdsByProductId(productId: string): Promise<ProductAd[]> {
    return Array.from(this.ads.values()).filter(ad => ad.productId === productId);
  }

  async getAllAds(): Promise<ProductAd[]> {
    return Array.from(this.ads.values());
  }

  async updateProductAiSummary(productId: string, aiSummary: string): Promise<void> {
    const product = this.products.get(productId);
    if (product) {
      product.aiSummary = aiSummary;
      this.products.set(productId, product);
    }
  }
}

function createStorage(): IStorage {
  if (supabaseConfigured) {
    console.log("[storage] Using Supabase backend");
    return new SupabaseStorage();
  }
  console.log("[storage] Supabase not configured — using in-memory storage");
  return new MemStorage();
}

export const storage = createStorage();
