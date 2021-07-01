CREATE FUNCTION ctfnote.past_ctfs_users ()
  RETURNS SETOF ctfnote.profile
  AS $$
  SELECT
    (profile."id",
      profile."color",
      profile."username")
  FROM
    ctfnote.profile
    INNER JOIN ctfnote_private.user ON profile.id = "user".id
  WHERE
    "user".role = 'user_guest'::ctfnote.role OR "user".role = 'user_past_ctfs'::ctfnote.role;

$$
LANGUAGE SQL
SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION ctfnote.past_ctfs_users TO user_past_ctfs;