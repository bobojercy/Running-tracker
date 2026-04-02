const { recognizeRunningData } = require('../backend/ocr');
const path = require('path');

async function testOCR() {
  const uploadsDir = path.join(__dirname, '../uploads');
  const fs = require('fs');
  
  // 获取最新的上传文件
  const files = fs.readdirSync(uploadsDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('没有找到上传的截图文件');
    return;
  }
  
  const latestFile = path.join(uploadsDir, files[0]);
  console.log('测试文件:', latestFile);
  console.log('========================================\n');
  
  const result = await recognizeRunningData(latestFile);
  
  console.log('\n========================================');
  console.log('最终识别结果:');
  console.log('  距离:', result.distance, 'km');
  console.log('  配速:', result.pace);
  console.log('  时长:', result.duration);
  console.log('  卡路里:', result.calories);
  
  // 验证
  const { validateRunningData } = require('../backend/ocr');
  const validation = validateRunningData(result);
  console.log('\n验证结果:', validation.isValid ? '✅ 有效' : '❌ 无效');
  if (!validation.isValid) {
    console.log('  原因:', validation.errors.join(', '));
  }
}

testOCR().catch(console.error);
