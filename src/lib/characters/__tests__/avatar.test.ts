import {
  buildAvatarPromptSlug,
  buildAvatarSlugValuesForGender,
  characterAvatarFilePath,
  characterAvatarPublicDirectory,
  characterAvatarPublicPath,
  DEFAULT_AVATAR_SLUG_FIELDS,
} from "../avatar";

describe("character avatar helpers", () => {
  it("defines only the expected human avatar gender options", () => {
    const genderField = DEFAULT_AVATAR_SLUG_FIELDS.find((field) => field.key === "gender");

    expect(genderField?.options.map((option) => option.id)).toEqual(["female", "male"]);
  });

  it("builds a prompt slug from lifepath-defined enum values", () => {
    const values = {
      gender: "female",
      build: "average",
      clothing: "blue",
      hairColor: "blonde",
      eyeColor: "green",
    };

    expect(buildAvatarPromptSlug(DEFAULT_AVATAR_SLUG_FIELDS, values)).toBe(
      "female, average build, blue clothing, blonde hair, green eyes",
    );
  });

  it("uses gender plus field defaults for initial slug values", () => {
    const values = buildAvatarSlugValuesForGender(DEFAULT_AVATAR_SLUG_FIELDS, "male");

    expect(values).toEqual({
      gender: "male",
      build: "average",
      clothing: "blue",
      hairColor: "brown",
      eyeColor: "brown",
    });
  });

  it("builds character-scoped avatar asset paths", () => {
    expect(characterAvatarPublicDirectory("char-123")).toBe(
      "/generated/avatars/characters/char-123",
    );
    expect(characterAvatarPublicPath({
      characterId: "char-123",
      type: "portrait",
      version: 2,
      age: 34,
    })).toBe("/generated/avatars/characters/char-123/portrait-age-34-v2.png");
    expect(characterAvatarFilePath("/generated/avatars/characters/char-123/portrait-v1.png")).toBe(
      "public/generated/avatars/characters/char-123/portrait-v1.png",
    );
  });
});
