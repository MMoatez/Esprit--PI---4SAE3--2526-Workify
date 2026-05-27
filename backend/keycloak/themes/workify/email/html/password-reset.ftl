<html>
<body style="font-family: 'Inter', sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td align="left" style="padding: 0 0 40px 0;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                                <span style="color: #00C3A5;">Work</span><span style="color: #FF7A00;">ify</span>
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td align="left" style="padding: 0 0 20px 0; color: #1E293B; font-size: 16px; line-height: 1.5;">
                            ${kcSanitize(msg("passwordResetBodyHtml",link, linkExpiration, realmName, linkExpirationFormatter(linkExpiration)))?no_esc}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px 0;">
                            <a href="${link}" style="background-color: #00A3FF; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                                ${msg("passwordResetButtonText")}
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td align="left" style="padding: 20px 0 0 0; color: #64748B; font-size: 14px; line-height: 1.5; border-top: 1px solid #E2E8F0;">
                            ${msg("emailFooterInfo")}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
