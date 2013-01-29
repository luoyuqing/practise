package com.chance.teststh;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AbsListView;
import android.widget.AbsListView.OnScrollListener;
import android.widget.BaseAdapter;
import android.widget.Gallery;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.TextView;

import com.chance.teststh.PinnedList.PinnedHeaderAdapter;

public class TestAdapter extends BaseAdapter implements PinnedHeaderAdapter,
OnScrollListener {

	public static final String TAG = "TestAdapter";
	private LayoutInflater inflater;

	private Context context;
	private ArrayList<Person> datas;
	private int lastItem = 0;

	private volatile int state = PINNED_HEADER_PUSHED_UP;
	public TestAdapter(Context context,final LayoutInflater inflater) {
		this.inflater = inflater;
		this.context = context;
		loadData();
	}

	@Override
	public int getCount() {
		// TODO Auto-generated method stub
		return 5;
		//return datas.size();
	}

	@Override
	public Object getItem(int position) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public long getItemId(int position) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {
		// TODO Auto-generated method stub
		View view = convertView;
		if (view == null) {
			view = inflater.inflate(R.layout.item_list_log, null);
			Gallery g = (Gallery)view.findViewById(R.id.log_list_contentpic);

			int[] data = new int[]{R.drawable.placefive,R.drawable.placefour,R.drawable.placethree,R.drawable.placetwo,R.drawable.placeone};
			TestGalleryAdapter t = new TestGalleryAdapter(context, data);
			g.setAdapter(t);



			ListView tlistView = (ListView)view.findViewById(R.id.log_list_replay);

			List<Map<String,String>> dataOftlistView = new ArrayList<Map<String,String>>();
			Map<String,String> mapindataoflistview = new HashMap<String, String>();
			mapindataoflistview.put("name", "nametest1");
			mapindataoflistview.put("comment", "good comments1");
			dataOftlistView.add(mapindataoflistview);
			mapindataoflistview = new HashMap<String, String>();
			mapindataoflistview.put("name", "nametest2");
			mapindataoflistview.put("comment", "good comments2");
			dataOftlistView.add(mapindataoflistview);
			SimpleAdapter sa = new SimpleAdapter(context, dataOftlistView, R.layout.item_comments,new String[]{"name","comment"} , new int[]{R.id.name,R.id.comment});

			tlistView.setAdapter(sa);


		}else{

		}


		final Person person = datas.get(position);
		final TextView header = (TextView) view.findViewById(R.id.log_list_tv_nickname);
		//	final Gallery photo = (Gallery) view
		//			.findViewById(R.id.log_list_contentpic);
		//textView.setText(person.getNumber());
		header.setText(person.getName());
		Log.d(TAG,person.getName());
		/*if (lastItem == position) {
			header.setVisibility(View.INVISIBLE);
		} else {
			header.setVisibility(View.VISIBLE);
		}*/
		
		
		return view;
	}

	@Override
	public int getPinnedHeaderState(int position) {
		// TODO Auto-generated method stub
		return state;
	}

	@Override
	public void configurePinnedHeader(View header, int position) {
		// TODO Auto-generated method stub
		
		//以下是改变姓名的代码

		((TextView) header.findViewById(R.id.log_list_tv_nickname_h)).setText(datas.get(
				position-1).getName());

		
		if (lastItem != position) {
			notifyDataSetChanged();
		}
		Log.d(TAG,"pos");
		lastItem = position;
	}
	
	private void loadData() {
		datas = new ArrayList<Person>();
		for (int i = 0; i < 50; i++) {
			Person p = new Person();
			p.setName("name-" + i);
			//p.setNumber("100" + i);
			datas.add(p);
		}
	}

	@Override
	public void onScroll(AbsListView view, int firstVisibleItem,
			int visibleItemCount, int totalItemCount) {
		
		//以下代码就是控制写行博那一个layout的显示和隐藏
		
		if(firstVisibleItem == 0){
			state = PINNED_HEADER_GONE;
			View v = ((Activity)context).findViewById(R.id.log_write);
			v.setVisibility(View.GONE);
		}else{
			state = PINNED_HEADER_PUSHED_UP;
			View v = ((Activity)context).findViewById(R.id.log_write);
			v.setVisibility(View.VISIBLE);
		}
		Log.d(TAG," "+firstVisibleItem);
		if (view instanceof PinnedList) {
			((PinnedList) view).configureHeaderView(firstVisibleItem);
		}
		
	}

	@Override
	public void onScrollStateChanged(AbsListView view, int scrollState) {

	}

}
