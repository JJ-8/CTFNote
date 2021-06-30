DROP FUNCTION ctfnote.reset_password ("token" text, "password" text);

CREATE FUNCTION ctfnote.reset_password ("token" text, "password" text)
    RETURNS ctfnote.jwt
    AS $$
DECLARE
    user_id int;
BEGIN
    SELECT
        user_id INTO user_id
    FROM
        ctfnote_private.reset_password_link
    WHERE
        reset_password_link.token::text = reset_password.token
        AND expiration > now();
    IF user_id IS NOT NULL THEN
        DELETE FROM ctfnote_private.reset_password_link
        WHERE reset_password_link.token::text = reset_password.token;
        UPDATE
            ctfnote_private."user"
        SET
            PASSWORD = crypt(reset_password."password", gen_salt('bf'))
        WHERE
            "user".id = user_id;
        RETURN ctfnote_private.new_token (user_id);
    ELSE
        RAISE EXCEPTION 'Invalid token';
    END IF;
END
$$
LANGUAGE plpgsql
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ctfnote.reset_password (text, text) TO user_anonymous;
