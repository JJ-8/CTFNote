GRANT user_guest TO user_member;

REVOKE user_guest FROM user_past_ctfs;

REVOKE user_past_ctfs FROM user_member;

UPDATE ctfnote_private.user SET role = 'user_guest'::ctfnote.role WHERE role = 'user_past_ctfs'::ctfnote.role;

UPDATE ctfnote_private.invitation_link SET role = 'user_guest'::ctfnote.role WHERE role = 'user_past_ctfs'::ctfnote.role;

DROP ROLE user_past_ctfs;
