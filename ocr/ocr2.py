import re
import sys
import pandas as pd
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
        data = list(collection.find())
        
        # สร้าง DataFrame จากข้อมูล MongoDB
        df = pd.DataFrame(data)
        
        logging.info(f"Original data count: {len(df)}")
        
        # ลบ whitespace และแปลงเป็นตัวพิมพ์เล็ก
        df['clean_en_code'] = df['en_code'].str.strip()
        
        # แสดงข้อมูลที่ซ้ำกัน
        duplicates = df.duplicated(subset=['clean_en_code'], keep=False)
        if duplicates.any():
            logging.info("Duplicate entries in MongoDB data:")
            # logging.info(df[duplicates][['en_code','en_name','en_section', 'en_semester']])
        
        # ลบข้อมูลที่ซ้ำกันออก
        df_unique = df.drop_duplicates(subset=['clean_en_code'], keep='first')
        
        logging.info(f"Original data count: {len(df)}")
        # logging.info(df_unique[duplicates][['en_code','en_name','en_section', 'en_semester']])
        
        logging.info(f"After removing duplicates: {len(df_unique)}")
        
        return df_unique.to_dict('records')
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
        
        # ดึงข้อมูลจากไฟล์ PDF
        subject_codes = re.findall(r'\d{9}', text) 
        grades = re.findall(r'\b[ABCDF][+-]?\b|\bIp\b', text)
        cs_value = re.findall(r'CS\s*(\d+)', text)

        if not cs_value:
            logging.error("No CS value found in the PDF")
            return
        
        
        last_cs_value = cs_value[-1]
        total_credits = int(last_cs_value)
        
        # สร้าง DataFrame จากข้อมูลในไฟล์ PDF
        pdf_data = []
        for i, code in enumerate(subject_codes):
            if i < len(grades):
                grade = clean_grade(grades[i])                
                pdf_data.append({
                    'code': clean_subject_code(code),
                    'grade': grade
                })
        
        pdf_df = pd.DataFrame(pdf_data)
        pdf_df['clean_code'] = pdf_df['code'].str.strip()

        # ลบข้อมูลที่ซ้ำกันและมีเกรด F, W หรือ N/A
        # logging.info(f"brfore {pdf_df}")
        
        pdf_df = pdf_df.drop_duplicates(subset=['code'], keep='first')
        pdf_df = pdf_df[~pdf_df['grade'].isin(['F', 'W', 'N/A', 'Ip'])]
        
        
        # เก็บตัวแปรสำหรับตรวจสอบเงื่อนไข
        major_credits = len(pdf_df[pdf_df['clean_code'].str.startswith('0406')]) * 3

        passed_project_2 = False
        # ตรวจสอบรหัสวิชาเฉพาะเพื่อลดหรือเพิ่ม major_credits
        for _, row in pdf_df.iterrows():
            clean_code = row['clean_code'] # Extract first 9 characters of the subject code

            if clean_code in ['040613405', '040613142']:  # Special Project II
                passed_project_2 = True


        major_credits -= 3  # Adjusted after the checks

        # แสดงผลการตรวจสอบทั้งหมด
        logging.info(f"""
        Credit Check Results:
        Total credits: {total_credits} (required: 102)
        Major credits: {major_credits} (required: 46)
        """)  
        
        results = []
        if passed_project_2:
            logging.info(f"Pass: Student  pass Special Project II")
            results.append(f"Pass: Student  pass Special Project II")
        else:
            logging.info(f"Pass: Student  pass Special Project II")
            results.append(f"Fail: Student not pass Special Project II")
        result = ";\n".join(results)
        return print(update_results_in_mongodb(student_id,result))
    except Exception as e:
        logging.error(f"Error processing PDF: {e}")

def main():
    if len(sys.argv) != 2:
        # print("Usage: python script.py <student_id>")
        sys.exit(1)

    student_id = sys.argv[1]
    files = get_files_from_mongodb(student_id)
    # print(student_id)

    if not files:
        print(f"No files found for student ID: {student_id}")
        sys.exit(1)

    for file_path in files:
        if file_path and isinstance(file_path, str) and file_path.endswith('.pdf'):
            check(file_path, student_id)

if __name__ == "__main__":
    main()