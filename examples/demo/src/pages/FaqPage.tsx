import { useRestring, useRegisterSection } from 'restringjs';

interface FaqItem {
  questionPath: string;
  answerPath: string;
  defaultQuestion: string;
  defaultAnswer: string;
}

const faqItems: FaqItem[] = [
  {
    questionPath: 'faq.1.question',
    answerPath: 'faq.1.answer',
    defaultQuestion: 'What is restringjs?',
    defaultAnswer:
      'restringjs is a live string editor for React. It gives your team a sidebar where they can tweak every user-facing string in your app, see changes instantly, then permanently bake those edits into your source files.',
  },
  {
    questionPath: 'faq.2.question',
    answerPath: 'faq.2.answer',
    defaultQuestion: 'Does it work with i18n libraries?',
    defaultAnswer:
      'Yes! restringjs understands ICU MessageFormat and i18next patterns out of the box. It validates syntax, extracts variables, and handles plural forms with locale-aware labels.',
  },
  {
    questionPath: 'faq.3.question',
    answerPath: 'faq.3.answer',
    defaultQuestion: 'How does baking work?',
    defaultAnswer:
      'The CLI uses ts-morph to perform AST transforms on your source files. It finds useRestring calls and replaces the defaultValue with your override. Formatting, comments, and code structure are preserved.',
  },
  {
    questionPath: 'faq.4.question',
    answerPath: 'faq.4.answer',
    defaultQuestion: 'Is there any runtime cost in production?',
    defaultAnswer:
      'None. When enabled is false, the sidebar and all editing logic tree-shake completely. After baking, you can remove restringjs entirely — your strings are hardcoded in source.',
  },
  {
    questionPath: 'faq.5.question',
    answerPath: 'faq.5.answer',
    defaultQuestion: 'Can I use custom storage backends?',
    defaultAnswer:
      'Absolutely. restringjs ships with memory, localStorage, and REST adapters. You can also implement the RestringAdapter interface for any custom backend.',
  },
];

function FaqEntry({ item }: { item: FaqItem }) {
  const question = useRestring({
    path: item.questionPath,
    defaultValue: item.defaultQuestion,
    section: 'faq',
  });

  const answer = useRestring({
    path: item.answerPath,
    defaultValue: item.defaultAnswer,
    section: 'faq',
  });

  return (
    <div className="faq-item">
      <h3 className="faq-question">{question}</h3>
      <p className="faq-answer">{answer}</p>
    </div>
  );
}

export function FaqPage() {
  useRegisterSection({ id: 'faq', label: 'FAQ', order: 1, description: 'Frequently asked questions' });

  return (
    <div>
      <h2 className="page-title">Frequently Asked Questions</h2>
      <p className="page-subtitle">Common questions about restringjs — all editable in the sidebar.</p>
      <div className="faq-list">
        {faqItems.map((item) => (
          <FaqEntry key={item.questionPath} item={item} />
        ))}
      </div>
    </div>
  );
}
