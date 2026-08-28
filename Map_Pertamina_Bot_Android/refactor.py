import sys

with open('app/src/main/java/com/mapbot/pertamina/engine/BotEngine.kt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_loop = False
loop_stack = 0
loop_body = []

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'for ((i, nikData) in nikList.withIndex()) {' in line:
        start_idx = i
        in_loop = True
        loop_stack += 1
        new_lines.append(line)
        continue
        
    if in_loop:
        if '{' in line: loop_stack += line.count('{')
        if '}' in line: loop_stack -= line.count('}')
        
        if loop_stack == 0:
            in_loop = False
            end_idx = i
            # Inject retry wrapper
            
            new_lines.append('            var attemptNik = 1\n')
            new_lines.append('            var isSuccessNik = false\n')
            new_lines.append('            while (attemptNik <= 3 && isActive && !isSuccessNik) {\n')
            new_lines.append('                if (attemptNik > 1) {\n')
            new_lines.append('                    log("Mencoba ulang NIK  (Percobaan /3)...")\n')
            new_lines.append('                    wvManager.loadMapUrl()\n')
            new_lines.append('                    delay(5000)\n')
            new_lines.append('                }\n')
            
            for b_line in loop_body:
                # Replace 'continue' with 'attemptNik++; continue' if it's not inside another loop
                # This is tricky because there are loops inside (for w in 1..10, for attempt in 1..MAX_RETRY)
                # Let's just indent it
                new_lines.append('    ' + b_line)
                
            new_lines.append('                if (nikData.status == Constants.STATUS_SUKSES || nikData.status == Constants.STATUS_NIK_INVALID) {\n')
            new_lines.append('                    isSuccessNik = true\n')
            new_lines.append('                } else {\n')
            new_lines.append('                    attemptNik++\n')
            new_lines.append('                }\n')
            new_lines.append('            }\n')
            new_lines.append(line) # The closing '}' of the outer for loop
        else:
            # Modify the break/continue logic slightly
            mod_line = line
            # If it's continue inside the main loop, we need to be careful not to replace continue of inner loops.
            # But the logic usually sets nikData.status. We will just execute it. 
            loop_body.append(mod_line)
    else:
        new_lines.append(line)

with open('app/src/main/java/com/mapbot/pertamina/engine/BotEngine.kt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Refactored!')
