CREATE OR REPLACE FUNCTION ctfnote_private.can_play_ctf (ctf_id int)
  RETURNS boolean
  AS $$
  SELECT
    ctfnote_private.is_member ()
    OR (
      SELECT
        TRUE
      FROM
        ctfnote.invitation
      WHERE
        invitation.ctf_id = can_play_ctf.ctf_id
        AND invitation.profile_id = ctfnote_private.current_id ())
$$
LANGUAGE sql
STABLE;

GRANT EXECUTE ON FUNCTION ctfnote_private.can_play_ctf TO user_guest;

DROP FUNCTION ctfnote_private.is_past_ctfs ();