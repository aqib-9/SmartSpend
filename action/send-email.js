import { Resend } from "resend";

export async function SendEmail(to, subject, react) {
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    try{
    const { data, error } = await resend.emails.send({
    from: 'SmartSpend <onboarding@resend.dev>',
    to,
    subject,
    react,
    });
    return {success : true, data};

    }catch (error){
        console.log(error);
        return {success : false, error};

    }
    
}