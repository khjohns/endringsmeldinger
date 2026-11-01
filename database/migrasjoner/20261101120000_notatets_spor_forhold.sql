-- Sporet `grunnlag` heter `forhold` (OV-U83, #1453). Verdien i notatene følger
-- sporet i journalen, som kjernen skriver.

ALTER TABLE koe.notat DROP CONSTRAINT notat_spor;
GO
UPDATE koe.notat SET spor = N'forhold' WHERE spor = N'grunnlag';
ALTER TABLE koe.notat ADD CONSTRAINT notat_spor CHECK (spor IN (N'forhold', N'vederlag', N'frist'));
