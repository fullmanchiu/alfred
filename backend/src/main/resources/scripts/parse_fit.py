#!/usr/bin/env python3
"""
FIT文件解析脚本
使用fitparse库解析Garmin .fit文件，输出JSON格式的运动数据
"""
import sys
import json
from datetime import datetime
from fitparse import FitFile

def parse_fit_file(file_path):
    """解析FIT文件并返回运动数据"""
    try:
        fitfile = FitFile(file_path)

        records = []
        laps = []

        # 解析记录点
        for record in fitfile.get_messages('record'):
            record_data = {
                'timestamp': record.get_value('timestamp'),
                'position_lat': record.get_value('position_lat'),
                'position_long': record.get_value('position_long'),
                'altitude': record.get_value('altitude'),
                'speed': record.get_value('speed'),
                'heart_rate': record.get_value('heart_rate'),
                'power': record.get_value('power'),
                'cadence': record.get_value('cadence'),
                'distance': record.get_value('distance')
            }

            # 只保留有效数据
            if record_data['timestamp'] is not None or record_data['position_lat'] is not None:
                # 转换datetime为ISO格式字符串
                if record_data['timestamp']:
                    record_data['timestamp'] = record_data['timestamp'].isoformat()
                records.append(record_data)

        # 解析分段
        for lap in fitfile.get_messages('lap'):
            lap_data = {
                'start_time': lap.get_value('start_time'),
                'total_elapsed_time': lap.get_value('total_elapsed_time'),
                'total_distance': lap.get_value('total_distance'),
                'avg_heart_rate': lap.get_value('avg_heart_rate'),
                'avg_power': lap.get_value('avg_power'),
                'avg_speed': lap.get_value('avg_speed')
            }

            if lap_data['start_time']:
                lap_data['start_time'] = lap_data['start_time'].isoformat()
            laps.append(lap_data)

        # 解析会话信息（获取运动类型、总距离等）
        sessions = list(fitfile.get_messages('session'))
        session_data = {}
        if sessions:
            session = sessions[0]
            session_data = {
                'sport': session.get_value('sport'),
                'total_distance': session.get_value('total_distance'),
                'total_timer_time': session.get_value('total_timer_time'),
                'total_calories': session.get_value('total_calories')
            }

        result = {
            'success': True,
            'records': records,
            'laps': laps,
            'session': session_data
        }

        print(json.dumps(result, default=str))
        return 0

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        return 1

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'Usage: parse_fit.py <fit_file_path>'}))
        sys.exit(1)

    fit_file_path = sys.argv[1]
    sys.exit(parse_fit_file(fit_file_path))
