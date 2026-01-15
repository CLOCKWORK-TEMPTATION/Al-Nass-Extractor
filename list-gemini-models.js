// list-gemini-models.js
// عرض جميع نماذج Gemini المتاحة عبر REST API

import 'dotenv/config';

async function listModels() {
  console.log('📋 جاري جلب النماذج المتاحة...\n');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ خطأ: GEMINI_API_KEY غير موجود في ملف .env');
    process.exit(1);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];

    console.log(`✅ تم العثور على ${models.length} نموذج:\n`);

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      if (model.displayName) console.log(`   الاسم: ${model.displayName}`);
      if (model.description) console.log(`   الوصف: ${model.description.substring(0, 100)}...`);
      if (model.supportedGenerationMethods) {
        console.log(`   الطرق المدعومة: ${model.supportedGenerationMethods.join(', ')}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

listModels();
