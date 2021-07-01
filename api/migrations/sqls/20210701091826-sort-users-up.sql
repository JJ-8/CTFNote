CREATE OR REPLACE FUNCTION ctfnote.users ()
  RETURNS SETOF ctfnote.user_response
  AS $$
  SELECT
    "id",
    "login",
    "role"
  FROM
    ctfnote_private.user
  ORDER BY "id";
$$ STABLE
LANGUAGE SQL
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ctfnote.users () TO user_admin;