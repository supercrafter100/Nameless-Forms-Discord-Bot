export interface ApiForm {
    id: number;
    url: string;
    url_full: string;
    title: string;
    captcha: boolean;
    comment_status: string;
    fields: FormField[]
}

export interface FormField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    min: string;
    max: string;
    placeholder: string;
    options: string; // Ffs partydragen why
    info: string;
}