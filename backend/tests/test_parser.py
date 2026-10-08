from parser import parse_txt_file


def test_parses_mask_question_and_answers_without_prefixes():
    questions = parse_txt_file("X0110\nIle to 2+2?\na) 3\nb) 4\nc) cztery\nd) 5\n")

    assert questions == [{
        "content": "Ile to 2+2?",
        "answers": [
            {"content": "3", "is_correct": False},
            {"content": "4", "is_correct": True},
            {"content": "cztery", "is_correct": True},
            {"content": "5", "is_correct": False},
        ],
    }]


def test_ignores_text_before_first_mask_and_handles_multiple_questions():
    questions = parse_txt_file("śmieci\n\nX10\nP1\nA\nB\nx 0 1\nP2\nA\nB\n")

    assert [question["content"] for question in questions] == ["P1", "P2"]
    assert [answer["is_correct"] for answer in questions[1]["answers"]] == [False, True]
