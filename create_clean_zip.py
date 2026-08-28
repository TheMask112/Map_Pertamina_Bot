import os
import zipfile
import sys

def create_zip():
    base_dir = "dist"
    output_zip = os.path.join(base_dir, "Bot_MAP_Pertamina_Installer.zip")
    
    # Files to include from dist/
    allowed_files = [
        "Bot_MAP_Pertamina.exe",
        "Instal_Bot.bat",
        "vc_redist.x64.exe",
        "Panduan_Penggunaan.pdf"
    ]
    
    # Folders to include recursively from dist/
    allowed_folders = [
        "browser_bin"
    ]
    
    print(f"Creating clean zip file: {output_zip}...")
    
    temp_zip = os.path.join(base_dir, "temp_installer.zip")
    
    try:
        with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Add allowed files
            for f in allowed_files:
                file_path = os.path.join(base_dir, f)
                if os.path.exists(file_path):
                    print(f"Adding file: {f}")
                    zipf.write(file_path, f)
                else:
                    print(f"Info: {f} not found, skipping.")
            
            # 2. Add allowed folders recursively
            for folder in allowed_folders:
                folder_path = os.path.join(base_dir, folder)
                if os.path.exists(folder_path):
                    print(f"Adding folder recursively: {folder}")
                    for root, dirs, files in os.walk(folder_path):
                        for file in files:
                            full_path = os.path.join(root, file)
                            rel_path = os.path.relpath(full_path, base_dir)
                            zipf.write(full_path, rel_path)
                else:
                    print(f"Info: {folder} folder not found, skipping.")
                    
        # Replace the old zip if it exists
        if os.path.exists(output_zip):
            os.remove(output_zip)
            
        os.rename(temp_zip, output_zip)
        print(f"Clean ZIP successfully created at: {output_zip}")
        
    except Exception as e:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        print(f"Error creating ZIP: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_zip()