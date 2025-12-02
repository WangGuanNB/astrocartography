export interface ContactPage {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
  title: string;
  subtitle: string;
  description: string;
  form: {
    name: {
      label: string;
      placeholder: string;
    };
    email: {
      label: string;
      placeholder: string;
    };
    subject: {
      label: string;
      placeholder: string;
    };
    message: {
      label: string;
      placeholder: string;
    };
    submit: string;
    submitting: string;
    success: string;
    success_detail: string;
    error: string;
    error_detail: string;
  };
  alternative: {
    title: string;
    email: {
      label: string;
      value: string;
      description: string;
    };
    response: string;
  };
  faq?: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

