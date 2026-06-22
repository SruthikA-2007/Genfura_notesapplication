from flask import Flask, render_template

app = Flask(__name__, 
            template_folder='template', 
            static_folder='static')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/contact.html')
def contact_alias():
    # Adding this to support existing hardcoded links to contact.html
    return render_template('contact.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/index.html')
def home_alias():
    # Adding this to support existing hardcoded links to index.html
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
