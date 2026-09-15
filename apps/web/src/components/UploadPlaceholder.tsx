interface Props {
  title: string;
}

// Phase 3 stub — real upload/conversion/review UI lands once the backend
// pipeline (schema, conversion, accept/reject endpoints) is built.
export function UploadPlaceholder({ title }: Props) {
  return (
    <div className="page">
      <h2>{title}</h2>
      <p className="muted">Coming soon — Phase 3 in progress.</p>
    </div>
  );
}
