const { exec } = require('child_process');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

/**
 * 调用 PaddleOCR
 */
function runPaddleOCR(imagePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = require('path').join(__dirname, 'paddle_ocr.py');
    exec(`python3.8 ${scriptPath} "${imagePath}"`, { 
      timeout: 120000,
      env: { ...process.env, PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: 'True' }
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('PaddleOCR 失败:', error);
        reject(error);
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) reject(new Error(result.error));
        else resolve(result);
      } catch (e) {
        console.error('解析 PaddleOCR 失败:', e);
        reject(e);
      }
    });
  });
}

/**
 * Tesseract 补充识别（仅识别距离）
 */
async function recognizeDistanceWithTesseract(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // 裁剪顶部区域（距离通常在截图顶部）
    const buffer = await image
      .resize(metadata.width * 2, metadata.height * 2)
      .grayscale()
      .normalize()
      .toBuffer();
    
    const { data: { text } } = await Tesseract.recognize(buffer, 'chi_sim+eng', {
      tessedit_char_whitelist: '0123456789.公里 km',
      tessedit_pageseg_mode: '3',
    });
    
    // 查找 X.XX 格式
    const match = text.match(/(\d\.\d{2})/);
    if (match) {
      const dist = parseFloat(match[1]);
      if (dist >= 0.1 && dist < 50) {
        console.log(`🔍 Tesseract 识别到距离：${dist} km`);
        return dist;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Tesseract 识别失败:', error);
    return null;
  }
}

/**
 * 预处理图片（修正方向、深色背景反色）
 */
async function preprocessImage(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    console.log(`📷 原始图片：${metadata.width}x${metadata.height}, 方向：${metadata.orientation || 1}`);
    
    let pipeline = sharp(imagePath);
    
    // 修正 EXIF 方向
    if (metadata.orientation && metadata.orientation !== 1) {
      pipeline = pipeline.rotate();
      console.log('🔄 修正图片方向');
    }
    
    // 检测是否为深色背景（sharp stats 返回 16 位值 0-65535）
    const stats = await pipeline.stats();
    const avgBrightness = stats.channels[0].mean / 65535;
    console.log(`📊 平均亮度：${avgBrightness.toFixed(2)} (阈值：<0.5)`);
    
    // 如果是深色背景或中等亮度（手机截图可能包含白色边框），进行反色处理
    if (avgBrightness < 0.5) {
      console.log('🌙 检测到深色背景，进行反色处理');
      pipeline = pipeline.negate();
    } else {
      console.log('☀️ 白色背景，保持原图');
    }
    
    // 保存预处理后的图片供 PaddleOCR 使用
    const processedPath = imagePath.replace(/\.(\w+)$/, '_processed.$1');
    await pipeline.toFile(processedPath);
    
    console.log(`✅ 图片预处理完成：${processedPath}`);
    return processedPath;
  } catch (error) {
    console.error('⚠️ 图片预处理失败，使用原图:', error.message);
    return imagePath;
  }
}

/**
 * 识别跑步数据
 */
async function recognizeRunningData(imagePath) {
  try {
    console.log(`\n========== OCR 识别 ==========`);
    console.log(`图片：${imagePath}`);
    
    // 预处理图片（修正方向、增强对比度）
    const processedPath = await preprocessImage(imagePath);
    
    // 使用 PaddleOCR
    const ocrResult = await runPaddleOCR(processedPath);
    
    console.log(`\n识别完成，行数：${ocrResult.lines?.length || 0}`);
    console.log('\n前 20 行:');
    ocrResult.lines?.slice(0, 20).forEach((line, i) => console.log(`  [${i}]: ${line}`));
    console.log('---');
    
    const text = ocrResult.text;
    const result = parseRunningData(text, ocrResult.lines || []);
    result.rawText = text;
    
    // 如果 PaddleOCR 未识别到距离，尝试 Tesseract
    if (!result.distance) {
      console.log('\n🔍 PaddleOCR 未识别到距离，尝试 Tesseract...');
      const tesseractDist = await recognizeDistanceWithTesseract(imagePath);
      if (tesseractDist) {
        result.distance = tesseractDist;
        result._tesseract = true;
      }
    }
    
    console.log('\n解析结果:', result);
    
    // 清理预处理文件
    if (processedPath !== imagePath) {
      const fs = require('fs');
      fs.unlink(processedPath, (err) => {
        if (err) console.error('清理预处理文件失败:', err);
      });
    }
    
    return result;
  } catch (error) {
    console.error('OCR 失败:', error);
    throw new Error(`OCR 识别失败：${error.message}`);
  }
}

/**
 * 解析数据
 */
function parseRunningData(text, lines) {
  const result = { distance: null, pace: null, paceMinPerKm: null, duration: null, calories: null, rawText: text };
  
  // 配速/时长/卡路里 - 尝试在同一行匹配
  for (const line of lines) {
    // 匹配 10'40" 21:22:07 421 或 1040" 21:22:07 421
    const match = line.match(/(\d{1,2})'?\s*(\d{1,2})["']?\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\d+)/);
    if (match) {
      const pm = parseInt(match[1]);
      const ps = parseInt(match[2]);
      const h = parseInt(match[3]);
      const m = parseInt(match[4]);
      const s = parseInt(match[5]);
      const cal = parseInt(match[6]);
      
      if (pm < 30 && ps < 60 && m < 60 && s < 60) {
        result.pace = `${pm}'${ps.toString().padStart(2, '0')}"`;
        result.paceMinPerKm = pm + ps / 60;
        result.duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        result.calories = cal;
        console.log(`✅ 配速/时长/卡路里：${result.pace} ${result.duration} ${result.calories} (同行)`);
        break;
      }
    }
  }
  
  // 如果没找到，尝试分行匹配
  if (!result.pace) {
    // 策略 1: 查找"平均配速"或"配速"标签附近的行（前后 3 行）
    for (let i = 0; i < lines.length; i++) {
      if (/平均配速 | 配速/i.test(lines[i])) {
        console.log(`🔍 找到配速标签在第 ${i} 行：${lines[i]}`);
        // 在标签前后 3 行内查找配速
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length - 1, i + 3);
        for (let j = start; j <= end; j++) {
          const line = lines[j];
          // 匹配 12'23" 或 12'23 或 12 23 或 12'23'! (OCR 可能识别出感叹号)
          const paceMatch = line.match(/(\d{1,2})[''']?\s*(\d{1,2})["']?!?/);
          if (paceMatch) {
            const pm = parseInt(paceMatch[1]);
            const ps = parseInt(paceMatch[2]);
            if (pm >= 3 && pm < 30 && ps < 60) {
              result.pace = `${pm}'${ps.toString().padStart(2, '0')}"`;
              result.paceMinPerKm = pm + ps / 60;
              console.log(`✅ 配速：${result.pace} (标签附近第${j}行)`);
              break;
            }
          }
        }
        if (result.pace) break;
      }
    }
  }
  
  // 策略 2: 查找配速行：12'23" 或 12'23 或 12'23'! (必须有引号)
  if (!result.pace) {
    const paceLine = lines.find(l => l.match(/(\d{1,2})['''](\d{1,2})/));
    if (paceLine) {
      const paceMatch = paceLine.match(/(\d{1,2})['''](\d{1,2})/);
      if (paceMatch) {
        const pm = parseInt(paceMatch[1]);
        const ps = parseInt(paceMatch[2]);
        if (pm >= 3 && pm < 30 && ps < 60) {
          result.pace = `${pm}'${ps.toString().padStart(2, '0')}"`;
          result.paceMinPerKm = pm + ps / 60;
          console.log(`✅ 配速：${result.pace} (分行)`);
        }
      }
    }
  }
  
  // 策略 3: 查找类似 1223 格式（可能是 12'23 被识别为连续数字）
  if (!result.pace) {
    for (const line of lines) {
      const match = line.match(/^(\d{4})$/);
      if (match) {
        const pm = parseInt(match[1].substring(0, 2));
        const ps = parseInt(match[1].substring(2, 4));
        if (pm >= 3 && pm < 30 && ps < 60) {
          result.pace = `${pm}'${ps.toString().padStart(2, '0')}"`;
          result.paceMinPerKm = pm + ps / 60;
          console.log(`✅ 配速：${result.pace} (4 位数字)`);
          break;
        }
      }
    }
  }
  
  // 查找时长行：HH:MM:SS
  if (!result.duration) {
    // 策略 1: 查找"用时"或"时长"标签附近（前后 3 行）
    for (let i = 0; i < lines.length; i++) {
      if (/用时 | 时长 | 时间/i.test(lines[i])) {
        console.log(`🔍 找到时长标签在第 ${i} 行：${lines[i]}`);
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length - 1, i + 3);
        for (let j = start; j <= end; j++) {
          const line = lines[j];
          const durMatch = line.match(/(\d{1,2}):(\d{2}):(\d{2})/);
          if (durMatch) {
            const h = parseInt(durMatch[1]);
            const m = parseInt(durMatch[2]);
            const s = parseInt(durMatch[3]);
            if (m < 60 && s < 60) {
              result.duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              console.log(`✅ 时长：${result.duration} (标签附近第${j}行)`);
              break;
            }
          }
        }
        if (result.duration) break;
      }
    }
  }
  
  if (!result.duration) {
    const durationLine = lines.find(l => l.match(/(\d{1,2}):(\d{2}):(\d{2})/));
    if (durationLine) {
      const durMatch = durationLine.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (durMatch) {
        const h = parseInt(durMatch[1]);
        const m = parseInt(durMatch[2]);
        const s = parseInt(durMatch[3]);
        if (m < 60 && s < 60) {
          result.duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          console.log(`✅ 时长：${result.duration} (分行)`);
          
          // 时长行后面可能就是卡路里
          const durIndex = lines.indexOf(durationLine);
          if (durIndex >= 0 && durIndex < lines.length - 1) {
            const nextLine = lines[durIndex + 1];
            const calMatch = nextLine.match(/^(\d{2,4})$/);
            if (calMatch && !result.calories) {
              const cal = parseInt(calMatch[1]);
              if (cal > 50 && cal < 3000) {
                result.calories = cal;
                console.log(`✅ 卡路里：${result.calories} (时长后)`);
              }
            }
          }
        }
      }
    }
  }
  
  // 查找卡路里行：在"消耗"或"大卡"附近的数字
  if (!result.calories) {
    // 策略 1: 查找"消耗大卡"标签附近（前后 3 行）
    for (let i = 0; i < lines.length; i++) {
      if (/消耗 | 大卡 | 卡路里 | 热量/i.test(lines[i])) {
        console.log(`🔍 找到卡路里标签在第 ${i} 行：${lines[i]}`);
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length - 1, i + 3);
        for (let j = start; j <= end; j++) {
          const line = lines[j];
          const calMatch = line.match(/^(\d{2,4})$/);
          if (calMatch) {
            const cal = parseInt(calMatch[1]);
            if (cal > 50 && cal < 3000) {
              result.calories = cal;
              console.log(`✅ 卡路里：${result.calories} (标签附近第${j}行)`);
              break;
            }
          }
        }
        if (result.calories) break;
      }
    }
  }
  
  // 策略 2: 查找纯数字行（可能是卡路里）
  if (!result.calories) {
    for (const line of lines) {
      const match = line.match(/^(\d{2,3})$/);
      if (match) {
        const cal = parseInt(match[1]);
        if (cal > 50 && cal < 2000) {
          result.calories = cal;
          console.log(`✅ 卡路里：${result.calories} (纯数字)`);
          break;
        }
      }
    }
  }
  
  // 如果还是没找到，尝试宽松匹配（兼容 OCR 错误）
  if (!result.pace || !result.duration) {
    for (const line of lines) {
      const match = line.match(/(\d{3,5})\S*\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\d+)/);
      if (match) {
        const paceNum = match[1];
        let pm, ps;
        if (paceNum.length >= 4) { pm = parseInt(paceNum.substring(0, 2)); ps = parseInt(paceNum.substring(2, 4)); }
        else { pm = parseInt(paceNum.substring(0, 1)); ps = parseInt(paceNum.substring(1, 3)); }
        
        let h = parseInt(match[2]);
        let m = parseInt(match[3]);
        let s = parseInt(match[4]);
        const cal = parseInt(match[5]);
        
        if (s === 0 && m > 100) { s = m % 100; m = Math.floor(m / 100); }
        
        if (pm < 30 && ps < 60 && m < 60 && s < 60) {
          if (!result.pace) {
            result.pace = `${pm}'${ps.toString().padStart(2, '0')}"`;
            result.paceMinPerKm = pm + ps / 60;
            console.log(`✅ 配速：${result.pace} (宽松)`);
          }
          if (!result.duration) {
            result.duration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            console.log(`✅ 时长：${result.duration} (宽松)`);
          }
          if (!result.calories) {
            result.calories = cal;
            console.log(`✅ 卡路里：${result.calories} (宽松)`);
          }
          break;
        }
      }
    }
  }
  
  // 距离识别 - 按优先级
  // 策略 1: X.XX 公里（最准确）
  for (const line of lines) {
    const match = line.match(/(\d+\.?\d*)\s*(公里|km|KM)/i);
    if (match) {
      const dist = parseFloat(match[1]);
      if (dist >= 0.1 && dist < 100) {
        result.distance = dist;
        console.log(`✅ 距离：${result.distance} km (带单位)`);
        break;
      }
    }
  }
  
  // 策略 2: XXX 公里 → X.XX
  if (!result.distance) {
    for (const line of lines) {
      const match = line.match(/(\d{3,4})\s*公里/);
      if (match) {
        const s = match[1];
        const dist = s.length === 4 ? parseFloat(s.substring(0,2)+'.'+s.substring(2)) : parseFloat(s.substring(0,1)+'.'+s.substring(1));
        if (dist >= 0.1 && dist < 100) {
          result.distance = dist;
          console.log(`✅ 距离 (数字 + 公里): ${dist}`);
          break;
        }
      }
    }
  }
  
  // 策略 3: 333 公 → 3.33
  if (!result.distance) {
    for (const line of lines) {
      if (/公/.test(line)) {
        const match = line.match(/(\d{3})\s*公/);
        if (match) {
          const dist = parseFloat(match[1].substring(0,1)+'.'+match[1].substring(1));
          if (dist >= 0.1 && dist < 50) {
            result.distance = dist;
            console.log(`✅ 距离 (333 公): ${dist}`);
            break;
          }
        }
      }
    }
  }
  
  // 策略 4: 单独 XX.XX 或 X.XX 格式（但排除 PM2.XX 等）
  if (!result.distance) {
    for (const line of lines) {
      // 确保不是 PM2.567 这种格式
      if (!/PM|pm/i.test(line)) {
        // 优先匹配 XX.XX 格式（如 10.99）
        const match2 = line.match(/(\d{2}\.\d{2})/);
        if (match2) {
          const dist = parseFloat(match2[1]);
          if (dist >= 3 && dist < 100) {
            result.distance = dist;
            console.log(`✅ 距离 (XX.XX): ${dist}`);
            break;
          }
        }
        // 再匹配 X.XX 格式（如 3.56）
        const match1 = line.match(/(\d\.\d{2})/);
        if (match1) {
          const dist = parseFloat(match1[1]);
          if (dist >= 0.1 && dist < 50) {
            result.distance = dist;
            console.log(`✅ 距离 (X.XX): ${dist}`);
            break;
          }
        }
      }
    }
  }
  
  // 智能校验
  if (result.duration && result.paceMinPerKm) {
    const parts = result.duration.split(':').map(Number);
    const durationMin = parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    const expectedDistance = durationMin / result.paceMinPerKm;
    
    console.log(`\n========== 智能校验 ==========`);
    console.log(`时长：${durationMin.toFixed(1)} 分钟，配速：${result.paceMinPerKm.toFixed(2)} 分/km`);
    console.log(`预期距离：${expectedDistance.toFixed(2)} km，识别距离：${result.distance || '未识别'}`);
    
    if (!result.distance) {
      console.log(`📍 OCR 未识别到距离，使用公式计算：${expectedDistance.toFixed(2)} km`);
      result.distance = parseFloat(expectedDistance.toFixed(2));
      result._calculated = true;
    } else if (result._tesseract) {
      console.log(`✓ 使用 Tesseract 识别结果`);
    } else {
      const diffPercent = Math.abs(expectedDistance - result.distance) / result.distance * 100;
      console.log(`差异：${diffPercent.toFixed(1)}%`);
      
      if (diffPercent < 20) console.log(`✓ OCR 识别准确`);
      else if (diffPercent < 80) console.log(`⚠️ 差异较大，保留 OCR 结果`);
      else if (result.distance < 2 && expectedDistance > 5) {
        const corrected = parseFloat(result.distance.toString().replace(/^1\./, '7.'));
        console.log(`⚠️ 7→1 错误，修正：${result.distance} → ${corrected}`);
        result.distance = corrected;
        result._corrected = true;
      }
    }
  }
  
  return result;
}

/**
 * 验证数据
 */
function validateRunningData(data) {
  const errors = [];
  if (!data.distance || data.distance < 3) errors.push(`距离不足 3 公里 (当前：${data.distance || 0}km)`);
  if (!data.paceMinPerKm || data.paceMinPerKm >= 12) errors.push(`配速过慢 (当前：${data.pace || '未知'}，要求<12 分/km)`);
  return { isValid: errors.length === 0, errors };
}

module.exports = { recognizeRunningData, parseRunningData, validateRunningData };
