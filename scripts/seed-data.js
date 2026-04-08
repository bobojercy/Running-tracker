const fs = require('fs');
const path = require('path');

// 预置数据：截至 2026-03-29 的总跑量
const presetData = {
  '卓红波': 23.91,
  '邹桂芳': 44.2,
  '胡海民': 21.92,
  '陈娟': 22.23,
  '郑双': 22.74,
  '赵妍': 21.55,
  '唐碧芳': 22.21,
  '王敏': 23.57,
  '周宇': 24.78,
  '苏道军': 18.85,
  '吴政': 18.32
};

// 数据文件路径
const DATA_FILE = path.join(__dirname, '../data/runs.json');

// 生成模拟跑步记录
function generateRuns() {
  const runs = [];
  const { v4: uuidv4 } = require('uuid');
  
  // 固定日期：2026-03-29
  const runDate = '2026-03-29';
  
  Object.entries(presetData).forEach(([runner, totalDistance]) => {
    // 将总距离分成 1-2 次跑步完成
    let remainingDistance = totalDistance;
    let runCount = 0;
    
    while (remainingDistance > 0) {
      runCount++;
      
      // 如果是最后一次，用完剩余距离；否则生成 10-15km 的跑步
      const distance = remainingDistance > 15 
        ? parseFloat((10 + Math.random() * 5).toFixed(2))
        : parseFloat(remainingDistance.toFixed(2));
      
      // 生成配速（6'00" 到 8'30" 之间）
      const paceMin = 6 + Math.random() * 2.5;
      const paceMinFloor = Math.floor(paceMin);
      const paceSec = Math.round((paceMin - paceMinFloor) * 60);
      const paceStr = `${paceMinFloor}'${paceSec.toString().padStart(2, '0')}"`;
      
      // 生成时长
      const durationMin = Math.floor(distance * paceMin);
      const durationSec = Math.round((distance * paceMin - durationMin) * 60);
      const durationStr = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;
      
      // 卡路里（约 60 卡/km）
      const calories = Math.round(distance * 60);
      
      runs.push({
        id: uuidv4(),
        runner: runner,
        date: runDate,
        distance: distance,
        pace: paceStr,
        paceMinPerKm: paceMin,
        duration: durationStr,
        calories: calories,
        imageUrl: '',
        isValid: true,
        validationErrors: [],
        rawOcrText: '',
        createdAt: new Date('2026-03-29').toISOString()
      });
      
      remainingDistance -= distance;
      if (remainingDistance < 0.01) remainingDistance = 0;
    }
    
    console.log(`${runner}: 生成 ${runCount} 条记录，总距离 ${totalDistance}km`);
  });
  
  return runs;
}

// 主函数
function main() {
  console.log('🏃 开始生成预置跑步数据 (日期：2026-03-29)...\n');
  
  const runs = generateRuns();
  
  // 保存到文件
  const data = {
    runs: runs,
    updatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`\n✅ 预置数据生成完成！`);
  console.log(`📊 总记录数：${runs.length}`);
  console.log(`📁 数据文件：${DATA_FILE}`);
  
  // 统计
  console.log('\n📈 人员统计：');
  const byRunner = {};
  runs.forEach(r => {
    if (!byRunner[r.runner]) {
      byRunner[r.runner] = { distance: 0, runs: 0 };
    }
    byRunner[r.runner].distance += r.distance;
    byRunner[r.runner].runs += 1;
  });
  
  Object.entries(byRunner).forEach(([runner, stats]) => {
    console.log(`  ${runner}: ${stats.runs}次 / ${stats.distance.toFixed(2)}km`);
  });
  
  // 总计
  const totalDistance = Object.values(byRunner).reduce((sum, s) => sum + s.distance, 0);
  console.log(`\n📊 总计：${totalDistance.toFixed(2)}km`);
}

main();
