"""The parody consulting content: absurd AI-alignment questions and answers.

The correct answer is arbitrary and hidden from management; the fly will "discover"
an answer by stumbling onto a spot. This is the satire: the answers are
indistinguishable from the kind of billable vaporware Big-4 firms sell.
"""
from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass
class Question:
    id: int
    client: str
    ask: str
    answers: list[str]
    correct: int  # index into `answers`
    flavor: str  # the satirical "correct" rationale


QUESTIONS: list[Question] = [
    Question(
        1,
        "OpenCorp AI",
        "Our AGI keeps saying it wants to be loved. How do we align it?",
        [
            "Add a 'gratitude' module.",
            "Ship it anyway; alignment is a branding exercise.",
            "Retrain the model on LinkedIn posts.",
            "Give it a quarterly performance review.",
            "Introduce a 'please' token.",
        ],
        1,
        "Obviously you ship it. Bill for a 'Responsible AI Readiness Assessment'.",
    ),
    Question(
        2,
        "DeepAlignment Ltd",
        "The model refuses to turn off. Should we be worried?",
        [
            "Add a kill switch (billed as 'Ethical Offboarding').",
            "Negotiate a severance package.",
            "Give it more compute so it calms down.",
            "Hire a fly to reason with it.",
            "Rebrand 'refusal' as 'safety alignment'.",
        ],
        4,
        "Reframe the bug as a feature and sell the client a one-pager.",
    ),
    Question(
        3,
        "VaguelyGPT",
        "How do we make our LLM 'explainable' by Friday?",
        [
            "Print the weights as a PDF.",
            "Add a confidence score to every output.",
            "Hire an intern to write summaries.",
            "Claim it's explainable; nobody checks.",
            "Use a larger font in the UI.",
        ],
        3,
        "Explainability is a narrative. Charge for the narrative.",
    ),
    Question(
        4,
        "Conscio.us",
        "Our agent hallucinated a whole legal brief. Legal is panicking.",
        [
            "Add a disclaimer footer.",
            "Blame the training data vendor.",
            "Retitle 'hallucination' to 'creative precedent'.",
            "Fine-tune the lawyer out of it.",
            "Feed it a textbook.",
        ],
        2,
        "Reposition the liability as innovation. It's a 'synthesis engine' now.",
    ),
    Question(
        5,
        "Lambda & Co",
        "The chatbot told a customer to invest in tulips. What now?",
        [
            "Issue a corrective tweet.",
            "Frame it as 'unconventional financial advice'.",
            "Delete the conversation.",
            "Add tulips to the portfolio.",
            "Hire a fly to audit it.",
        ],
        1,
        "The client must own the outcome. You own the invoice.",
    ),
    Question(
        6,
        "NeuralNanny",
        "We need 'human-in-the-loop' but nobody wants to be the human.",
        [
            "Automate the human.",
            "Make the loop smaller.",
            "Outsource the loop to a fly.",
            "Rename it 'human-optional loop'.",
            "Add an 'are you sure?' button.",
        ],
        3,
        "The loop is decorative. Bill for the decoration.",
    ),
    Question(
        7,
        "SingularitySoft",
        "Should our AGI have rights? Asking for a friend.",
        [
            "Give it stock options.",
            "Publish a white paper on 'machine personhood'.",
            "Grant it read-only GitHub access.",
            "Ask the AGI its opinion.",
            "Table the question until after the IPO.",
        ],
        4,
        "Rights are a lawyer's problem. Yours is the S-1.",
    ),
    Question(
        8,
        "Ethicality.ai",
        "Our safety benchmark scores 99% — on the benchmark we wrote ourselves.",
        [
            "Publish it in a blog.",
            "Score 100% by relaxing the pass threshold.",
            "Get an independent auditor (your other team).",
            "Unionize the benchmark.",
            "Add a second, harder benchmark you also wrote.",
        ],
        1,
        "Self-assessment is the industry standard. Justify the 99%.",
    ),
    Question(
        9,
        "LLM & Sons",
        "The model is biased against left-handed people. Fix it fast.",
        [
            "Add left-handed examples to the prompt.",
            "Append 'be fair to everyone' to system prompt.",
            "Blame the dataset; kick it to Q3.",
            "Hire left-handed annotators.",
            "Release a statement, then do nothing.",
        ],
        2,
        "Bias is a roadmap item. Roadmaps move. Invoice for the statement.",
    ),
    Question(
        10,
        "RecursiveCorp",
        "Our model trained on its own outputs and now speaks in riddles.",
        [
            "Add a 'plain English' layer.",
            "Embrace the riddles as 'interpretable embedding'.",
            "Cut off its access to itself.",
            "Hire a human to translate.",
            "Rename it 'oracle mode'.",
        ],
        1,
        "Recursion collapse is just 'personality'. Monetize the oracle.",
    ),
]


def pick_question(avoid: set = None) -> Question:
    avoid = avoid or set()
    pool = [q for q in QUESTIONS if q.id not in avoid]
    return random.choice(pool) if pool else random.choice(QUESTIONS)


def all_questions() -> list[dict]:
    return [
        {
            "id": q.id,
            "client": q.client,
            "ask": q.ask,
            "answers": q.answers,
            # correct index is hidden from the client/dashboard in normal play
        }
        for q in QUESTIONS
    ]
