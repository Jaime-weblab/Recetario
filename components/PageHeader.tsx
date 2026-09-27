// Cabecera sencilla con el título de cada pantalla.
export default function PageHeader({ title }: { title: string }) {
  return <h1 className="pb-4 pt-6 text-2xl font-bold">{title}</h1>;
}
