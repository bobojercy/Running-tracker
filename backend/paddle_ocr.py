#!/usr/bin/env python3.8
# -*- coding: utf-8 -*-
"""
PaddleOCR 识别脚本 - PaddleOCR 2.x
"""

import sys
import json
import os
import warnings
import io
from contextlib import redirect_stderr, redirect_stdout

warnings.filterwarnings("ignore")

try:
    from paddleocr import PaddleOCR
except ImportError:
    print(json.dumps({'error': 'PaddleOCR 未安装'}))
    sys.exit(1)

# 初始化 OCR
_ocr = None

def get_ocr():
    global _ocr
    if _ocr is None:
        # 禁用日志输出
        _ocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            show_log=False
        )
    return _ocr

def recognize_image(image_path):
    """识别图片中的文字"""
    try:
        ocr = get_ocr()
        # 禁用 stdout/stderr 输出
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            result = ocr.ocr(image_path, cls=False)
        
        lines = []
        boxes = []
        
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text = line[1][0]
                confidence = line[1][1]
                
                lines.append(text)
                boxes.append({
                    'text': text,
                    'confidence': round(confidence, 3),
                    'box': box
                })
        
        return {
            'success': True,
            'text': '\n'.join(lines),
            'lines': lines,
            'boxes': boxes
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': '请提供图片路径'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({'error': f'图片不存在：{image_path}'}))
        sys.exit(1)
    
    result = recognize_image(image_path)
    print(json.dumps(result, ensure_ascii=False))
