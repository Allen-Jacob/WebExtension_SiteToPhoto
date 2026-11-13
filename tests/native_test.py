import importlib.util,pathlib,tempfile,unittest,base64
spec=importlib.util.spec_from_file_location('host',pathlib.Path(__file__).parents[1]/'native/host.py');host=importlib.util.module_from_spec(spec);spec.loader.exec_module(host)
class NativeTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();host.ROOT=pathlib.Path(self.temp.name);self.writer=host.Writer()
 def tearDown(self):self.writer.cleanup();self.temp.cleanup()
 def test_write_and_collision(self):
  name='Photo web/jacoballen.ca - 2026-11-10_16-45-00-000/site.png';data=b'\x89PNG\r\n\x1a\n'+b'0'*24
  for suffix in ['site.png','site_1.png']:
   self.writer.handle({'action':'begin','filename':name});self.writer.handle({'action':'chunk','data':base64.b64encode(data).decode()});r=self.writer.handle({'action':'finish'});self.assertTrue(r['path'].endswith(suffix));self.assertEqual(pathlib.Path(r['path']).read_bytes(),data)
 def test_path_escape_and_symlink(self):
  for name in ['../Session_test/site.png','/Session_test/site.png','Photo web/Session_test/../../file.png','Photo web/Session_test/code.py']:
   with self.assertRaises(ValueError):host.destination(name)
  (host.ROOT/'Linked').symlink_to('/tmp',target_is_directory=True)
  with self.assertRaises(ValueError):host.destination('Linked/Session_test/site.png')
 def test_interrupted_cleanup(self):
  self.writer.handle({'action':'begin','filename':'Photo web/Session_test/site.png'});p=self.writer.temp;self.writer.cleanup();self.assertFalse(p.exists())
if __name__=='__main__':unittest.main()
