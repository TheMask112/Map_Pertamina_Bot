import os
import zipfile
import sys

def create_update_zip():
    base_dir = "dist"
    output_zip = os.path.join(base_dir, "Bot_MAP_Pertamina_Update.zip")
    
    # Hanya file yang diperbarui (tanpa browser_bin dan vc_redist yang statis/berat)
    update_files = [
        "Bot_MAP_Pertamina.exe",
        "Panduan_Penggunaan.pdf"
    ]
    
    print(f"Creating lightweight Update ZIP: {output_zip}...")
    temp_zip = os.path.join(base_dir, "temp_update.zip")
    
    try:
        with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for f in update_files:
                file_path = os.path.join(base_dir, f)
                if os.path.exists(file_path):
                    print(f"Adding file: {f}")
                    zipf.write(file_path, f)
                else:
                    print(f"Warning: {f} not found!")
                    
        if os.path.exists(output_zip):
            os.remove(output_zip)
            
        os.rename(temp_zip, output_zip)
        print(f"Update ZIP successfully created at: {output_zip}")
        
    except Exception as e:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_update_zip()
