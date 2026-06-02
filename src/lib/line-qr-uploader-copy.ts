type TranslationGetter = (key: string) => string;

export function buildLineQrUploaderCopy(t: TranslationGetter) {
  return {
    replaceLabel: t("forms.lineQrUploader.replace"),
    removeLabel: t("forms.lineQrUploader.remove"),
    uploadLabel: t("forms.lineQrUploader.upload"),
    formatHint: t("forms.lineQrUploader.formatHint"),
  };
}
