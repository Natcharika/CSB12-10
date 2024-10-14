import re
import sys
from pdfminer.high_level import extract_text
from pymongo import MongoClient
import logging

# ตั้งค่า logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

client = MongoClient('mongodb+srv://CSB:CSBject@csb.lxk2q.mongodb.net/')

def get_data_from_mongodb(database_name, collection_name):
    try:
        db = client[database_name]
        collection = db[collection_name]
        data = collection.find()
        return list(data)
    except Exception as e:
        logging.error(f"Error connecting to MongoDB: {e}")
        return None

def get_files_from_mongodb(student_id):
    try:
        db = client['test']
        collection = db['files']
        file_docs = collection.find_one({'fi_id': student_id})
        if file_docs:
            return file_docs.get('fi_file', [])
        return []
    except Exception as e:
        logging.error(f"Error connecting to MongoDB: {e}")
        return []
    
def update_results_in_mongodb(student_id,  result):
    try:
        db = client['test']
        collection = db['files']
        
        # ทำการอัปเดทและรอผลลัพธ์
        update_result = collection.update_one(
            {'fi_id': student_id},  # ใช้ fi_file ในการ match ด้วย
            {'$set': {'fi_result': result}},
            upsert=True  # สร้างเอกสารใหม่ถ้ายังไม่มี
        )
        
        # ตรวจสอบผลลัพธ์การอัปเดต
        logging.info(f"Matched count: {update_result.matched_count}")
        logging.info(f"Modified count: {update_result.modified_count}")
        
        if update_result.modified_count > 0 or update_result.upserted_id:
            logging.info(f"Successfully updated fi_result for student_id: {student_id}")
            return result
        
    except Exception as e:
        logging.error(f"Error updating MongoDB: {e}")


def clean_subject_code(code):
    if isinstance(code, str):
        return code.strip("[]' ")
    return 'N/A'

def clean_grade(grade):
    if isinstance(grade, str):
        return grade.strip("[]' ")
    return 'N/A'

# ฟังก์ชันตรวจสอบไฟล์ PDF
def check(file_path, student_id):
    logging.info(f"Starting check function for student ID: {student_id} with file: {file_path}")

    try:
        # อ่านข้อมูลจากไฟล์ PDF ทั้งหมด
        text = extract_text(file_path)
        subject_code = []
        grade = []
        # logging.info(f"all text {text}")

        # หากข้อมูลไม่อยู่ในบรรทัดเดียว ต้องจับข้อมูลแบบแยกบรรทัด
        # ดึงข้อมูลจากไฟล์ PDF
        subject_codes = re.findall(r'\d{9}', text) 
        grades = re.findall(r'\b[ABCDF][+-]?\b', text)
        cs_value = re.findall(r'CS\s*(\d+)', text)

        # ประมวลผลข้อมูลที่ดึงมา
        table_data = []
    
        # ตรวจสอบความยาวของข้อมูลแต่ละรายการ
        max_length = max(len(subject_codes),len(grades))

        # Loop เพื่อสร้างตารางข้อมูล
        for i in range(max_length):
            subject_codes[i] if i < len(subject_codes) else 'N/A'
            grades[i].strip() if i < len(grades) else 'N/A'
            # table_data.append([subject_code, subject_name, grade])
            subject_code.append(f'{subject_codes}')
            grade.append(f'{grades}')

        # ตรวจสอบว่าพบข้อมูล CS และ matches_term หรือไม่
        if cs_value :
            # เลือก CS ตัวสุดท้าย
            last_cs_value = cs_value[-1]

            print("Last CS Value:", last_cs_value)
        else:
            print("No CS or terms found")
        
        
        # ดึงข้อมูลรหัสนักศึกษา
        match = re.search(r'(\d{2}-\d{6}-\d{4}-\d)', text)
        if not match:
            logging.error("No student ID found in the PDF")
            return
        
        pdf_student_id = match.group(0).replace('-', '')
        if pdf_student_id != student_id:
            logging.error(f"Student ID mismatch: PDF={pdf_student_id}, Input={student_id}")
            return
        logging.info(f'pdf_student_id: {pdf_student_id}')
        
        # # เก็บตัวแปรสำหรับตรวจสอบเงื่อนไข
        total_credits = int(last_cs_value)
        SP1_credits = 0
        SP2_credits = 0
        
        # # เก็บผลลัพธ์เพื่อใช้แสดงในตาราง
        # table_data = []

        for i in range(max_length):
            current_code = subject_codes[i] if i < len(subject_codes) else 'N/A'
            current_grade = grades[i].strip() if i < len(grades) else 'N/A'
            
            subject_code.append(current_code)
            grade.append(current_grade)
            
        for i in range(len(subject_code)):
            current_code = clean_subject_code(subject_code[i])
            current_grade = clean_grade(grade[i])
    
            if current_grade in ['F', 'N/A']:
                continue

        if student_id:
            if total_credits >= 102 and (current_code.startswith('040613404') or current_code.startswith('040613405')):
                logging.info(f"Pass: Student has passed all credit requirements.")
                # result = f"Pass: Student has passed all credit requirements."
            else:
                results = []
                if total_credits < 102:
                    logging.info(f"Fail: Student {student_id} has insufficient total credits (has {total_credits}, needs 135).")
                    # results.append(f"Fail: Student {student_id} has insufficient total credits (has {total_credits}, needs 135).")
                if not current_code.startswith('040613404'):
                   logging.info(f"Fail: Student {student_id} don't have SP1 credits")
                    # results.append(f"Fail: Student {student_id} don't have SP1 credits")
                if not current_code.startswith('040613405'):
                    logging.info(f"Fail: Student {student_id} don't have SP2 credits")
                    # results.append(f"Fail: Student {student_id} don't have SP2 credits")
            # result = ";\n".join(results)
    except Exception as e:
        logging.error(f"Error processing PDF: {e}")

def main():
    # if len(sys.argv) != 2:
    #     # print("Usage: python script.py <student_id>")
    #     sys.exit(1)

    # student_id = sys.argv[1]
    # files = get_files_from_mongodb(student_id)
    student_id = "6304062636120"
    files = "/upload/6304062636120"
    # print(student_id)

    # if not files:
    #     print(f"No files found for student ID: {student_id}")
    #     sys.exit(1)

    for file_path in files:
        if file_path and isinstance(file_path, str) and file_path.endswith('.pdf'):
            check(file_path, student_id)
    

if __name__ == "__main__":
    main()