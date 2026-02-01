import re
from typing import List, Tuple, Dict

def parse_txt_file(content: str) -> List[Dict]:
    """
    Parsuje treść pliku .txt do struktury słownika.
    Zwraca listę pytań z odpowiedziami.
    """
    lines = content.splitlines()
    questions_data = []
    
    current_question = None
    current_answers = []
    correct_mask = "" # Przechowuje ciąg np. "1000"

    # Regex do wycinania "a)", "b)", "1." z początku odpowiedzi
    # Szuka litery/cyfry, po której następuje kropka lub nawias i spacja
    answer_prefix_pattern = re.compile(r"^\s*[a-zA-Z0-9]+[).]\s+")

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Wykrycie nagłówka pytania, np. X1000 lub X010
        if line.startswith('X') and all(c in '01' for c in line[1:]):
            
            # Jeśli mieliśmy już otwarte pytanie, zapisujemy je do listy
            if current_question:
                questions_data.append({
                    "content": current_question,
                    "answers": current_answers
                })

            # Resetujemy stan pod nowe pytanie
            correct_mask = line[1:] # Pobieramy to co po X, np "1000"
            current_question = None # Treść będzie w następnej linii
            current_answers = []
            
        elif correct_mask and current_question is None:
            # Pierwsza linia po X... to treść pytania
            current_question = line
            
        elif correct_mask and current_question:
            # Kolejne linie to odpowiedzi
            # Sprawdzamy, który to numer odpowiedzi, żeby dopasować do maski "1000"
            answer_index = len(current_answers)
            
            # Zabezpieczenie: czy maska jest wystarczająco długa?
            is_correct = False
            if answer_index < len(correct_mask):
                is_correct = (correct_mask[answer_index] == '1')

            # Czyścimy treść odpowiedzi (usuwamy "a) ", "b) ")
            clean_content = answer_prefix_pattern.sub("", line)

            current_answers.append({
                "content": clean_content,
                "is_correct": is_correct
            })

    # Dodanie ostatniego pytania z pliku (bo pętla się kończy)
    if current_question:
        questions_data.append({
            "content": current_question,
            "answers": current_answers
        })
        
    return questions_data
