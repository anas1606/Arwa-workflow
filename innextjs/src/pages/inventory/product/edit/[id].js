import EditProduct from '@/components/product/EditProduct';
import { useRouter } from 'next/router';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) return null;

  return <EditProduct id={id} />;
}
