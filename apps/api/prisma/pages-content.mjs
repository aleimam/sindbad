// Canonical content for the seeded static pages (EN + AR), shared by seed.mjs
// (fresh installs) and apply-pages.mjs (push to an existing DB).
//
// The web renderer supports #/##/### headings, **bold**, paragraphs, and
// "•" bullet lines (Latin numerals everywhere, per the product rule).
//
// `publish: true` pages are safe to show publicly on seed. Terms & Privacy are
// left unpublished (publish: false) pending legal review — publish them from the
// admin CMS once a lawyer has signed off.

export const STATIC_PAGES = [
  {
    slug: 'about',
    titleEn: 'About Sindbad',
    titleAr: 'عن سندباد',
    publish: true,
    bodyEn: `# About Sindbad

**Sindbad — Powered by Travelers.** Sindbad is a peer-to-peer marketplace that connects people who want to shop from abroad with trusted travelers who are already making the trip.

## What we do

Every day, people travel across borders with room to spare in their luggage. At the same time, shoppers everywhere want products that are hard to find, cheaper, or simply unavailable in their own country. Sindbad brings the two together: shoppers post what they need, travelers post their trips, and our platform matches them and safeguards the deal from start to finish.

## How it stays safe

Money for every deal is held in secure escrow and released only when the shopper confirms delivery. A time-weighted credibility score, paid identity verifications, mutual reviews, and a dedicated complaints team help keep the community trustworthy.

## Who we are

Sindbad is operated by **Yeldn LLC**. We are building a global, bilingual (English and Arabic) service that treats both travelers and shoppers with the same care — because the whole model only works when both sides win.`,
    bodyAr: `# عن سندباد

**سندباد — مدعوم بالمسافرين.** سندباد سوق يربط بين الأشخاص الذين يرغبون في التسوّق من الخارج وبين مسافرين موثوقين على وشك السفر بالفعل.

## ماذا نفعل

كل يوم يسافر أشخاص عبر الحدود ولديهم مساحة فائضة في أمتعتهم، وفي الوقت نفسه يبحث متسوّقون في كل مكان عن منتجات يصعب إيجادها أو تكون أرخص أو غير متوفرة في بلدانهم. يجمع سندباد الطرفين: ينشر المتسوّق ما يحتاجه، وينشر المسافر رحلته، وتتولّى منصّتنا المطابقة بينهما وحماية الصفقة من البداية إلى النهاية.

## كيف تبقى آمنة

تُحتجَز أموال كل صفقة في ضمان آمن (Escrow) ولا تُحرَّر إلا بعد تأكيد المتسوّق للاستلام. كما تساعد درجة المصداقية المرجّحة زمنياً، وعمليات التحقّق من الهوية، والتقييمات المتبادلة، وفريق شكاوى مخصّص في الحفاظ على مجتمع جدير بالثقة.

## من نحن

يُدار سندباد بواسطة **شركة Yeldn LLC**. نبني خدمة عالمية ثنائية اللغة (العربية والإنجليزية) تعامل المسافر والمتسوّق بالعناية نفسها — فالنموذج بأكمله لا ينجح إلا عندما يكسب الطرفان معاً.`,
  },

  {
    slug: 'guide',
    titleEn: 'How Sindbad Works',
    titleAr: 'كيف يعمل سندباد',
    publish: true,
    bodyEn: `# How Sindbad Works

Whether you are carrying items to earn or shopping from abroad, here is the full journey.

## For Travelers

**1. Post your trip.** Tell us your route, your travel dates, and how much spare weight you can carry. Choose a receiving address (kept private until a deal is agreed) and a public delivery location.

**2. Get matched.** Shoppers whose requests fit your route and dates can send you deal offers, and you can browse open shipments yourself.

**3. Agree the deal.** Review the item, the reward, and any conditions. Once both sides agree, the shopper's payment is locked in escrow and the private receiving address is shared with the shopper.

**4. Carry and deliver.** Receive or buy the item, carry it, and hand it over at the agreed location. Mark each step as you go.

**5. Get paid.** When the shopper confirms delivery, your reward is released from escrow to your wallet.

## For Shoppers

**1. Post a shipment.** Describe the item you want — a link, a photo, the quantity, and where it should be delivered.

**2. Choose a deal type.** A **Box** deal is for an item you already have or will send to the traveler. A **Basket** deal asks the traveler to buy the item abroad on your behalf.

**3. Fund escrow.** When you and the traveler agree, your payment is held safely by Sindbad — the traveler never receives it until you confirm delivery.

**4. Track and receive.** Follow the deal's progress in real time and chat with your traveler. Confirm delivery when the item is in your hands.

**5. Review.** Leave an honest review. Reviews are revealed once both sides submit, keeping them fair.

## Fees, escrow, and trust

Any applicable fee is always shown clearly **before** you confirm a deal. Funds stay in escrow until delivery is confirmed. Every member builds a credibility score over time, and paid verifications let you prove your identity and stand out.`,
    bodyAr: `# كيف يعمل سندباد

سواء كنت تحمل أغراضاً لتربح أو تتسوّق من الخارج، إليك الرحلة كاملة.

## للمسافرين

**1. انشر رحلتك.** أخبرنا بمسارك وتواريخ سفرك ووزن الأمتعة الفائض الذي يمكنك حمله. اختر عنوان استلام (يبقى خاصّاً حتى الاتفاق على الصفقة) وموقع تسليم عام.

**2. احصل على مطابقة.** يمكن للمتسوّقين الذين تناسب طلباتهم مسارك وتواريخك إرسال عروض صفقات إليك، كما يمكنك تصفّح الشحنات المفتوحة بنفسك.

**3. اتّفق على الصفقة.** راجع الغرض والمكافأة وأي شروط. بمجرّد موافقة الطرفين، يُحتجَز مبلغ المتسوّق في الضمان، ويُكشَف عنوان الاستلام الخاص للمتسوّق.

**4. احمل وسلّم.** استلم الغرض أو اشترِه، ثم احمله وسلّمه في الموقع المتّفق عليه. حدّد كل خطوة أولاً بأول.

**5. استلم مكافأتك.** عندما يؤكّد المتسوّق الاستلام، تُحرَّر مكافأتك من الضمان إلى محفظتك.

## للمتسوّقين

**1. انشر شحنة.** صِف الغرض الذي تريده — رابط، صورة، الكمية، ومكان التسليم.

**2. اختر نوع الصفقة.** صفقة **الصندوق (Box)** لغرض تملكه بالفعل أو سترسله للمسافر. وصفقة **السلّة (Basket)** تطلب من المسافر شراء الغرض من الخارج نيابةً عنك.

**3. موّل الضمان.** عند الاتفاق مع المسافر، يحتفظ سندباد بمبلغك بأمان — لا يستلمه المسافر إطلاقاً قبل أن تؤكّد الاستلام.

**4. تابع واستلم.** تابع تقدّم الصفقة لحظة بلحظة وتحدّث مع مسافرك، وأكّد الاستلام عندما يصل الغرض إليك.

**5. قيّم.** اترك تقييماً صادقاً. تُكشَف التقييمات بعد أن يقدّمها الطرفان، حفاظاً على العدل.

## الرسوم والضمان والثقة

تُعرَض أي رسوم بوضوح **قبل** تأكيد الصفقة دائماً، وتبقى الأموال في الضمان حتى تأكيد الاستلام. يبني كل عضو درجة مصداقية بمرور الوقت، وتتيح لك عمليات التحقّق المدفوعة إثبات هويتك والتميّز.`,
  },

  {
    slug: 'faq',
    titleEn: 'Frequently Asked Questions',
    titleAr: 'الأسئلة الشائعة',
    publish: true,
    bodyEn: `# Frequently Asked Questions

## Is my money safe?

Yes. When a deal is agreed, the shopper's payment is held in **escrow** by Sindbad and released to the traveler only after the shopper confirms delivery. If something goes wrong, you can raise a complaint and our team will review it.

## How much does it cost?

Any fee is shown clearly before you confirm a deal, so there are never surprises. You always see the full amount you will pay or receive up front.

## What is the difference between a Box and a Basket deal?

In a **Box** deal, the shopper already has the item (or sends it to the traveler) and just needs it carried. In a **Basket** deal, the traveler buys the item abroad on the shopper's behalf, then carries it.

## How do you keep travelers and shoppers trustworthy?

Every member has a **credibility score** that grows with successful deals and honest behavior. Members can also pay for **verifications** — such as national ID, passport, or address — to prove who they are. Mutual reviews and a complaints team round out the protections.

## When is the private receiving address shared?

A traveler's receiving address stays private until a deal is agreed by both sides. Only then is it shared with the shopper for that specific deal.

## What items can I not send or carry?

Anything illegal to export, import, or carry across borders is prohibited — including restricted, dangerous, or counterfeit goods. Both sides are responsible for complying with customs and local laws.

## What if there is a problem with a deal?

Open the deal, use the built-in chat first, and if you cannot resolve it, raise a complaint from the deal, request, chat, or review. Our moderation team can hold funds, deduct credibility, or take further action where warranted.

## Which currencies can I use?

Balances are held in US Dollars, with Egyptian Pound supported as well. Exchange rates are shown transparently before any conversion.`,
    bodyAr: `# الأسئلة الشائعة

## هل أموالي آمنة؟

نعم. عند الاتفاق على صفقة، يُحتجَز مبلغ المتسوّق في **الضمان (Escrow)** لدى سندباد ولا يُحرَّر للمسافر إلا بعد تأكيد المتسوّق للاستلام. وإذا حدث خطأ ما، يمكنك تقديم شكوى وسيراجعها فريقنا.

## كم التكلفة؟

تُعرَض أي رسوم بوضوح قبل تأكيد الصفقة، فلا مفاجآت أبداً. ترى دائماً المبلغ الكامل الذي ستدفعه أو تستلمه مقدّماً.

## ما الفرق بين صفقة الصندوق وصفقة السلّة؟

في صفقة **الصندوق (Box)** يملك المتسوّق الغرض بالفعل (أو يرسله للمسافر) ويحتاج فقط إلى حمله. أمّا في صفقة **السلّة (Basket)** فيشتري المسافر الغرض من الخارج نيابةً عن المتسوّق ثم يحمله.

## كيف تحافظون على ثقة المسافرين والمتسوّقين؟

لكل عضو **درجة مصداقية** تنمو مع الصفقات الناجحة والسلوك الصادق. كما يمكن للأعضاء دفع رسوم **عمليات تحقّق** — مثل الرقم القومي أو جواز السفر أو العنوان — لإثبات هويتهم. وتكمل التقييماتُ المتبادلة وفريقُ الشكاوى منظومةَ الحماية.

## متى يُكشَف عنوان الاستلام الخاص؟

يبقى عنوان استلام المسافر خاصّاً حتى يتّفق الطرفان على الصفقة، وعندها فقط يُكشَف للمتسوّق ولهذه الصفقة تحديداً.

## ما الأغراض التي لا يجوز إرسالها أو حملها؟

يُحظَر أي شيء غير قانوني تصديره أو استيراده أو حمله عبر الحدود — بما في ذلك السلع المقيّدة أو الخطرة أو المقلّدة. والطرفان مسؤولان عن الالتزام بالجمارك والقوانين المحلية.

## ماذا لو حدثت مشكلة في صفقة؟

افتح الصفقة واستخدم المحادثة المدمجة أولاً، وإذا تعذّر الحل، قدّم شكوى من الصفقة أو الطلب أو المحادثة أو التقييم. ويمكن لفريق الإشراف حجز الأموال أو خصم المصداقية أو اتخاذ إجراءات أخرى عند الاقتضاء.

## ما العملات التي يمكنني استخدامها؟

تُحفَظ الأرصدة بالدولار الأمريكي، مع دعم الجنيه المصري أيضاً. وتُعرَض أسعار الصرف بشفافية قبل أي تحويل.`,
  },

  {
    slug: 'contact',
    titleEn: 'Contact Us',
    titleAr: 'اتصل بنا',
    publish: true,
    bodyEn: `# Contact Us

We are here to help.

## Support

For questions about your account, a trip, a shipment, or a deal, the fastest way to reach us is from inside the app. Open the deal or conversation in question and use the built-in support and complaints tools so our team has the full context.

You can also email us at **support@sindbad.app**. We aim to respond within two business days.

## Reporting a problem with a deal

If a deal is not going as expected, open it and raise a complaint directly from the deal, request, chat, or review. This routes your report to our moderation team with everything they need to act.

## Company

Sindbad is operated by **Yeldn LLC**. For legal or business matters, please contact us at the email above and we will direct your message to the right team.`,
    bodyAr: `# اتصل بنا

نحن هنا لمساعدتك.

## الدعم

للاستفسارات المتعلّقة بحسابك أو رحلة أو شحنة أو صفقة، فإن أسرع وسيلة للتواصل معنا هي من داخل التطبيق. افتح الصفقة أو المحادثة المعنيّة واستخدم أدوات الدعم والشكاوى المدمجة ليكون لدى فريقنا السياق الكامل.

كما يمكنك مراسلتنا على **support@sindbad.app**، ونسعى للردّ خلال يومَي عمل.

## الإبلاغ عن مشكلة في صفقة

إذا لم تسر الصفقة كما هو متوقّع، افتحها وقدّم شكوى مباشرةً من الصفقة أو الطلب أو المحادثة أو التقييم. يوجّه ذلك بلاغك إلى فريق الإشراف لدينا مع كل ما يلزم لاتخاذ إجراء.

## الشركة

يُدار سندباد بواسطة **شركة Yeldn LLC**. للأمور القانونية أو التجارية، يُرجى مراسلتنا على البريد أعلاه وسنوجّه رسالتك إلى الفريق المناسب.`,
  },

  {
    slug: 'terms',
    titleEn: 'Terms of Service',
    titleAr: 'شروط الخدمة',
    publish: false, // pending legal review
    bodyEn: `# Terms of Service

_Effective date: to be set upon publication._

Welcome to Sindbad. These Terms of Service ("Terms") govern your access to and use of the Sindbad platform, websites, and apps (the "Service"), operated by **Yeldn LLC** ("Sindbad", "we", "us"). By creating an account or using the Service, you agree to these Terms.

## 1. Who can use Sindbad

You must be able to form a legally binding contract and comply with all laws that apply to you. You are responsible for the accuracy of the information you provide and for all activity on your account. Keep your credentials secure.

## 2. What Sindbad is — and is not

Sindbad is a **neutral marketplace and escrow facilitator** that connects shoppers with travelers. Travelers and shoppers contract **directly with each other**. Sindbad is **not** a party to those agreements, is not the buyer, seller, importer, exporter, or carrier of any item, and does not take ownership of any goods. We provide the tools — matching, messaging, escrow, credibility, reviews, and dispute handling — that help members transact with greater confidence.

## 3. Accounts and verification

You may hold a single unified account. We may offer paid verifications (such as identity, passport, or address) that increase trust and unlock features. Verification fees pay for the review itself and are **not refunded** if a verification is rejected.

## 4. Trips, shipments, and deals

Travelers post trips; shoppers post shipments. A **deal** may be a **Box** deal (the shopper supplies the item) or a **Basket** deal (the traveler purchases the item abroad). Both sides must describe items honestly and agree terms before a deal is confirmed. A traveler's private receiving address is disclosed to the shopper only after a deal is mutually agreed.

## 5. Prohibited and restricted items

You may not offer, request, send, or carry anything that is illegal to buy, sell, export, import, or transport, or that is dangerous, restricted, counterfeit, or infringing. **You are solely responsible** for complying with customs regulations, duties, taxes, and all applicable laws in every relevant country.

## 6. Escrow, fees, and payments

When a deal is agreed, the shopper's payment is held in **escrow** and released to the traveler only upon confirmed delivery, subject to these Terms and our dispute process. Any fees are displayed before you confirm a deal. Wallet balances may be held in supported currencies, and currency conversions use the rate shown at the time.

## 7. Cancellations and refunds

Deals may be cancelled under the conditions shown in the app. Where a deal is cancelled before delivery, escrowed funds are handled according to those conditions and our dispute process. Withdrawal requests place a hold on the relevant funds while they are processed.

## 8. Conduct, reviews, and credibility

You agree to communicate respectfully, act in good faith, and not manipulate reviews, credibility, or the dispute system. Reviews are mutual and revealed once both sides submit. We may adjust credibility, restrict features, hold funds, or suspend or block accounts in response to violations.

## 9. Complaints and moderation

You may raise complaints against a request, deal, chat, or review. Our moderation team may investigate and take proportionate action, which can include deducting credibility, holding membership, or blocking an account. Blocked members retain limited access necessary to complete ongoing deals.

## 10. Disclaimers and limitation of liability

The Service is provided "as is". To the fullest extent permitted by law, Sindbad disclaims warranties of any kind and is not liable for the acts, omissions, items, or conduct of any member, for lost, delayed, damaged, or seized goods, or for indirect or consequential damages. Nothing in these Terms limits liability that cannot be limited by law.

## 11. Termination

You may stop using the Service at any time. We may suspend or terminate access for violations of these Terms or applicable law. Certain obligations, including those relating to ongoing deals, escrow, and dispute resolution, survive termination.

## 12. Governing law

These Terms are governed by the laws of the United States and the state in which Yeldn LLC is organized, without regard to conflict-of-laws rules. _(Specific jurisdiction and dispute-resolution terms to be confirmed with counsel before publication.)_

## 13. Changes to these Terms

We may update these Terms from time to time. Material changes will be communicated through the Service, and your continued use after changes take effect constitutes acceptance.

## 14. Contact

Questions about these Terms? Contact us at **support@sindbad.app**.`,
    bodyAr: `# شروط الخدمة

_تاريخ السريان: يُحدَّد عند النشر._

مرحباً بك في سندباد. تحكم شروط الخدمة هذه ("الشروط") وصولك إلى منصّة سندباد ومواقعها وتطبيقاتها ("الخدمة") واستخدامك لها، والمُشغَّلة بواسطة **شركة Yeldn LLC** ("سندباد"، "نحن"). بإنشائك حساباً أو استخدامك للخدمة فإنك توافق على هذه الشروط.

## 1. من يمكنه استخدام سندباد

يجب أن تكون قادراً على إبرام عقد ملزم قانوناً وأن تلتزم بجميع القوانين المنطبقة عليك. أنت مسؤول عن دقّة المعلومات التي تقدّمها وعن كل نشاط يجري على حسابك. حافظ على سرّية بيانات دخولك.

## 2. ما هو سندباد — وما ليس هو

سندباد **سوق محايد وميسِّر للضمان** يربط المتسوّقين بالمسافرين. ويتعاقد المسافرون والمتسوّقون **مباشرةً فيما بينهم**. وسندباد **ليس** طرفاً في تلك الاتفاقات، وليس المشتري أو البائع أو المستورد أو المصدّر أو الناقل لأي غرض، ولا يمتلك أي بضائع. نحن نوفّر الأدوات — المطابقة والمراسلة والضمان والمصداقية والتقييمات ومعالجة النزاعات — التي تساعد الأعضاء على التعامل بثقة أكبر.

## 3. الحسابات والتحقّق

يجوز لك امتلاك حساب موحّد واحد. وقد نوفّر عمليات تحقّق مدفوعة (مثل الهوية أو جواز السفر أو العنوان) تزيد الثقة وتفتح ميزات. ورسوم التحقّق مقابل المراجعة نفسها و**لا تُرَدّ** في حال رفض التحقّق.

## 4. الرحلات والشحنات والصفقات

ينشر المسافرون الرحلات، وينشر المتسوّقون الشحنات. وقد تكون **الصفقة** صفقة **صندوق (Box)** (يوفّر المتسوّق الغرض) أو صفقة **سلّة (Basket)** (يشتري المسافر الغرض من الخارج). وعلى الطرفين وصف الأغراض بصدق والاتفاق على الشروط قبل تأكيد الصفقة. ولا يُكشَف عنوان الاستلام الخاص بالمسافر للمتسوّق إلا بعد الاتفاق المتبادل على الصفقة.

## 5. الأغراض المحظورة والمقيّدة

لا يجوز لك عرض أو طلب أو إرسال أو حمل أي شيء غير قانوني شراؤه أو بيعه أو تصديره أو استيراده أو نقله، أو أي شيء خطر أو مقيّد أو مقلّد أو منتهك للحقوق. **أنت وحدك المسؤول** عن الالتزام بأنظمة الجمارك والرسوم والضرائب وجميع القوانين المنطبقة في كل بلد ذي صلة.

## 6. الضمان والرسوم والمدفوعات

عند الاتفاق على صفقة، يُحتجَز مبلغ المتسوّق في **الضمان** ولا يُحرَّر للمسافر إلا عند تأكيد الاستلام، وفقاً لهذه الشروط ولعملية النزاعات لدينا. وتُعرَض أي رسوم قبل تأكيد الصفقة. وقد تُحفَظ أرصدة المحفظة بالعملات المدعومة، وتُجرى تحويلات العملات بالسعر المعروض حينها.

## 7. الإلغاء والاسترداد

يجوز إلغاء الصفقات وفق الشروط المعروضة في التطبيق. وحيثما أُلغيت صفقة قبل التسليم، تُعامَل أموال الضمان وفقاً لتلك الشروط ولعملية النزاعات. وتضع طلبات السحب حجزاً على الأموال المعنيّة أثناء معالجتها.

## 8. السلوك والتقييمات والمصداقية

توافق على التواصل باحترام والتصرّف بحسن نيّة وعدم التلاعب بالتقييمات أو المصداقية أو نظام النزاعات. والتقييمات متبادلة وتُكشَف بعد تقديم الطرفين لها. ويجوز لنا تعديل المصداقية أو تقييد الميزات أو حجز الأموال أو تعليق الحسابات أو حظرها رداً على المخالفات.

## 9. الشكاوى والإشراف

يجوز لك تقديم شكاوى ضدّ طلب أو صفقة أو محادثة أو تقييم. وقد يحقّق فريق الإشراف لدينا ويتّخذ إجراءً متناسباً، قد يشمل خصم المصداقية أو تعليق العضوية أو حظر الحساب. ويحتفظ الأعضاء المحظورون بوصول محدود يلزم لإتمام الصفقات الجارية.

## 10. إخلاء المسؤولية وحدودها

تُقدَّم الخدمة "كما هي". وإلى أقصى حدّ يسمح به القانون، يُخلي سندباد مسؤوليته عن الضمانات بجميع أنواعها، ولا يتحمّل مسؤولية أفعال أو تقصير أو أغراض أو سلوك أي عضو، ولا عن البضائع المفقودة أو المتأخّرة أو التالفة أو المصادَرة، ولا عن الأضرار غير المباشرة أو التبعية. ولا يحدّ أي بند في هذه الشروط من مسؤولية لا يمكن الحدّ منها قانوناً.

## 11. الإنهاء

يجوز لك التوقّف عن استخدام الخدمة في أي وقت. ويجوز لنا تعليق الوصول أو إنهاؤه عند مخالفة هذه الشروط أو القانون المنطبق. وتبقى التزامات معيّنة سارية بعد الإنهاء، بما فيها المتعلّقة بالصفقات الجارية والضمان وحلّ النزاعات.

## 12. القانون الحاكم

تخضع هذه الشروط لقوانين الولايات المتحدة والولاية التي تأسّست فيها شركة Yeldn LLC، دون اعتبار لقواعد تنازع القوانين. _(يُحدَّد الاختصاص القضائي وشروط حلّ النزاعات بالتشاور مع المستشار القانوني قبل النشر.)_

## 13. تغييرات على هذه الشروط

قد نحدّث هذه الشروط من وقت لآخر. وستُبلَّغ التغييرات الجوهرية عبر الخدمة، ويُعدّ استمرارك في الاستخدام بعد سريان التغييرات قبولاً بها.

## 14. التواصل

أسئلة حول هذه الشروط؟ تواصل معنا على **support@sindbad.app**.`,
  },

  {
    slug: 'privacy',
    titleEn: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    publish: false, // pending legal review
    bodyEn: `# Privacy Policy

_Effective date: to be set upon publication._

This Privacy Policy explains how **Yeldn LLC** ("Sindbad", "we") collects, uses, and protects your information when you use the Sindbad platform (the "Service").

## 1. Information we collect

**Information you provide:** account details (email and/or phone, password), your display name, trips, shipments, deal details, messages, reviews, and any documents you submit for verification (such as identity or address).

**Information from your use:** deal and transaction records, wallet and ledger activity, credibility events, complaints, and technical data such as device and connection information needed to run and secure the Service.

## 2. How we use your information

We use your information to operate the marketplace and escrow, match travelers and shoppers, process deals and payments, run verifications, calculate credibility, enable messaging and notifications, handle complaints and disputes, prevent fraud and abuse, comply with legal obligations, and improve the Service.

## 3. How we share information

Some profile and deal information is shared with the **other party to a deal** so the transaction can proceed — for example, a traveler's private receiving address is shared with the shopper once a deal is agreed. We also use trusted **service providers** (for example, messaging, payment, and hosting partners) who process data on our behalf under appropriate safeguards. We may disclose information where required by law or to protect our users and the Service.

## 4. Payment, email, and SMS providers

Payments, emails, and one-time codes are handled through third-party providers. Only the data necessary to deliver those messages or process those payments is shared with them.

## 5. Data retention

We keep your information for as long as your account is active and as needed to provide the Service, and thereafter as required to meet legal, accounting, dispute-resolution, and fraud-prevention obligations. _(Specific retention periods to be confirmed with counsel.)_

## 6. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to or restrict certain processing. To make a request, contact us using the details below. Some data may be retained where we have a legal obligation or legitimate need to keep it.

## 7. Security

We use technical and organizational measures to protect your information, including encryption in transit and access controls. Sensitive verification documents are stored privately and are accessible only to you and authorized staff. No system is perfectly secure, so please help by protecting your account credentials.

## 8. International transfers

Sindbad is a global service, and your information may be processed in countries other than your own, including the United States. Where required, we take steps to protect information transferred across borders.

## 9. Children

The Service is not directed to children who cannot lawfully consent to these practices, and we do not knowingly collect their information.

## 10. Changes to this policy

We may update this Privacy Policy from time to time and will communicate material changes through the Service.

## 11. Contact

For privacy questions or to exercise your rights, contact us at **support@sindbad.app**.`,
    bodyAr: `# سياسة الخصوصية

_تاريخ السريان: يُحدَّد عند النشر._

توضّح سياسة الخصوصية هذه كيف تجمع **شركة Yeldn LLC** ("سندباد"، "نحن") معلوماتك وتستخدمها وتحميها عند استخدامك منصّة سندباد ("الخدمة").

## 1. المعلومات التي نجمعها

**معلومات تقدّمها أنت:** بيانات الحساب (البريد الإلكتروني و/أو الهاتف، وكلمة المرور)، واسم العرض، والرحلات، والشحنات، وتفاصيل الصفقات، والرسائل، والتقييمات، وأي مستندات تقدّمها للتحقّق (مثل الهوية أو العنوان).

**معلومات من استخدامك:** سجلّات الصفقات والمعاملات، ونشاط المحفظة ودفتر الأستاذ، وأحداث المصداقية، والشكاوى، وبيانات تقنية مثل معلومات الجهاز والاتصال اللازمة لتشغيل الخدمة وتأمينها.

## 2. كيف نستخدم معلوماتك

نستخدم معلوماتك لتشغيل السوق والضمان، ومطابقة المسافرين والمتسوّقين، ومعالجة الصفقات والمدفوعات، وإجراء عمليات التحقّق، واحتساب المصداقية، وتمكين المراسلة والإشعارات، ومعالجة الشكاوى والنزاعات، ومنع الاحتيال وإساءة الاستخدام، والامتثال للالتزامات القانونية، وتحسين الخدمة.

## 3. كيف نشارك المعلومات

تُشارَك بعض معلومات الملف الشخصي والصفقة مع **الطرف الآخر في الصفقة** كي تمضي المعاملة — فمثلاً يُشارَك عنوان الاستلام الخاص بالمسافر مع المتسوّق بمجرّد الاتفاق على الصفقة. كما نستعين بـ**مزوّدي خدمات** موثوقين (مثل شركاء المراسلة والدفع والاستضافة) يعالجون البيانات نيابةً عنّا وفق ضمانات مناسبة. وقد نفصح عن المعلومات حيثما يقتضي القانون أو لحماية مستخدمينا والخدمة.

## 4. مزوّدو الدفع والبريد والرسائل النصية

تُعالَج المدفوعات ورسائل البريد والرموز لمرّة واحدة عبر مزوّدين خارجيين، ولا يُشارَك معهم سوى البيانات اللازمة لتسليم تلك الرسائل أو معالجة تلك المدفوعات.

## 5. الاحتفاظ بالبيانات

نحتفظ بمعلوماتك طوال بقاء حسابك نشطاً وبقدر ما يلزم لتقديم الخدمة، وبعد ذلك بقدر ما تقتضيه الالتزامات القانونية والمحاسبية وحلّ النزاعات ومنع الاحتيال. _(تُحدَّد مدد الاحتفاظ المحدّدة بالتشاور مع المستشار القانوني.)_

## 6. حقوقك

تبعاً لمكان إقامتك، قد تكون لك حقوق في الوصول إلى معلوماتك الشخصية أو تصحيحها أو تصديرها أو حذفها، وفي الاعتراض على معالجات معيّنة أو تقييدها. ولتقديم طلب، تواصل معنا عبر البيانات أدناه. وقد نحتفظ ببعض البيانات حيثما يكون لدينا التزام قانوني أو حاجة مشروعة للاحتفاظ بها.

## 7. الأمان

نستخدم تدابير تقنية وتنظيمية لحماية معلوماتك، بما فيها التشفير أثناء النقل وضوابط الوصول. وتُخزَّن مستندات التحقّق الحسّاسة بشكل خاص ولا يصل إليها سواك والموظّفون المخوّلون. ولا يوجد نظام آمن تماماً، لذا نرجو مساعدتنا بحماية بيانات دخول حسابك.

## 8. التحويلات الدولية

سندباد خدمة عالمية، وقد تُعالَج معلوماتك في دول غير دولتك، بما فيها الولايات المتحدة. وحيثما يلزم، نتّخذ خطوات لحماية المعلومات المنقولة عبر الحدود.

## 9. الأطفال

الخدمة غير موجّهة إلى الأطفال الذين لا يمكنهم قانوناً الموافقة على هذه الممارسات، ولا نجمع معلوماتهم عن علم.

## 10. تغييرات على هذه السياسة

قد نحدّث سياسة الخصوصية هذه من وقت لآخر، وسنبلّغ التغييرات الجوهرية عبر الخدمة.

## 11. التواصل

لأسئلة الخصوصية أو لممارسة حقوقك، تواصل معنا على **support@sindbad.app**.`,
  },
];
