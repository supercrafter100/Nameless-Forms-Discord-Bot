export type ApiForm = {
    id: number;
    url: string;
    url_full: string;
    title: string;
    captcha: boolean;
    comment_status: string;
    fields: FormField[]
}

export type FormField = {
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

export type ApiFormSubmitResponse = {
    submission_id: string;
    link: string;
}

export type ApiFormSubmitError = {
    error: string;
    meta: string[];
}