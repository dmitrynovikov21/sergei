const { Resend } = require('resend');

const apiKey = process.argv[2];
if (!apiKey) {
    console.error('Please provide API key as argument');
    process.exit(1);
}

const resend = new Resend(apiKey);

(async function () {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email',
            html: '<p>Testing API Key</p>'
        });

        if (error) {
            console.error('Validation failed:', error);
            process.exit(1);
        }

        console.log('Success:', data);
    } catch (err) {
        console.error('Exception:', err);
        process.exit(1);
    }
})();
