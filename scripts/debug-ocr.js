const { recognizeRunningData } = require('../backend/ocr');

async function test() {
  const result = await recognizeRunningData('./uploads/03a90814-b847-4d1b-848c-523e70c86445.png');
  
  console.log('\n=== 最终结果 ===');
  console.log('距离:', result.distance, 'km');
  console.log('配速:', result.pace);
  console.log('时长:', result.duration);
  console.log('卡路里:', result.calories);
  
  // 测试卡路里正则
  const testLine = "10'04\" 00:34:41 199";
  const patterns = [
    /\d+['']\d+["""]?\s+\d+:\d+:\d+\s+(\d+)/,
    /\d+'\d+[""]?\s+\d+:\d+:\d+\s+(\d+)/,
    /(\d+)\s*$/,
  ];
  
  console.log('\n=== 测试卡路里正则 ===');
  console.log('测试行:', testLine);
  patterns.forEach((p, i) => {
    const m = testLine.match(p);
    console.log(`模式${i+1}:`, m ? m[1] : '无匹配');
  });
}

test().catch(console.error);
