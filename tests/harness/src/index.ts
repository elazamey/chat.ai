/**
 * @aok/harness — Developer/Test Harness (العضو #30، وليس مجرد test suite):
 *   Mock World · Failure Injection · Chaos Runner · Replay Runner
 *   Deterministic Clock · Deterministic IDs · Fake Network/GitHub/Model/Vault
 *
 * يتيح اختبار: "ماذا لو اختفى الـRunner في منتصف commit؟"
 * أو "ماذا لو أعاد الـModel نتيجة خبيثة؟" — بـ$0.
 */
export * from './clock';
export * from './ids';
export * from './failures';
export * from './fakes';
export * from './replay';
